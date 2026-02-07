use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine as _;
use rand::{rngs::OsRng, RngCore};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_store::StoreExt;
use url::Url;

const PENDING_TTL: Duration = Duration::from_secs(600);
const TOKEN_SERVICE: &str = "vision-desktop";
const TOKEN_ACCOUNT: &str = "oauth_tokens";
const STORE_PATH: &str = "auth.json";
const STORE_KEY: &str = "tokens";
const STORE_PENDING_KEY: &str = "oauth_pending";
const STORE_PROVIDER_KEY: &str = "oauth_provider";
const REFRESH_WINDOW_SECS: i64 = 60;

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("invalid redirect url")]
    InvalidRedirectUrl,
    #[error("missing authorization code")]
    MissingCode,
    #[error("missing state")]
    MissingState,
    #[error("state mismatch")]
    StateMismatch,
    #[error("pending login expired")]
    PendingExpired,
    #[error("no pending login state")]
    NoPendingState,
    #[error("authorization denied: {0}")]
    AuthorizationDenied(String),
    #[error("token exchange failed with status {0}")]
    TokenExchangeFailed(StatusCode),
    #[error("refresh token missing")]
    RefreshTokenMissing,
    #[error("provider config missing; call oauth_prepare_login first")]
    ProviderConfigMissing,
    #[error("storage error: {0}")]
    Storage(String),
    #[error("request error: {0}")]
    Request(String),
    #[error("serialization error: {0}")]
    Serialization(String),
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ProviderConfig {
    pub client_id: String,
    pub client_secret: Option<String>,
    pub authorization_endpoint: String,
    pub token_endpoint: String,
    pub redirect_uri: String,
    pub scopes: Vec<String>,
    pub extra_auth_params: Option<HashMap<String, String>>,
    pub extra_token_params: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
pub struct PrepareLoginResponse {
    pub state: String,
    pub code_verifier: String,
    pub code_challenge: String,
    pub authorization_url: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct TokenSet {
    access_token: String,
    refresh_token: Option<String>,
    expires_at: i64,
}

#[derive(Debug)]
struct PendingAuth {
    state: String,
    code_verifier: String,
    provider: ProviderConfig,
    created_at: Instant,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct PendingAuthRecord {
    state: String,
    code_verifier: String,
    provider: ProviderConfig,
    created_at_epoch: i64,
}

pub struct AuthState {
    pending: Mutex<Option<PendingAuth>>,
    processing: Mutex<bool>,
    provider: Mutex<Option<ProviderConfig>>,
}

impl AuthState {
    pub fn new() -> Self {
        Self {
            pending: Mutex::new(None),
            processing: Mutex::new(false),
            provider: Mutex::new(None),
        }
    }
}

#[derive(Clone, Serialize)]
pub struct AuthStatus {
    pub is_authenticated: bool,
    pub expires_at: Option<i64>,
}

#[tauri::command]
pub fn oauth_prepare_login(
    app: AppHandle,
    state: State<'_, AuthState>,
    provider: ProviderConfig,
) -> Result<PrepareLoginResponse, String> {
    let state_value = random_urlsafe(32);
    let code_verifier = random_urlsafe(64);
    let code_challenge = pkce_challenge(&code_verifier);

    let mut pending = state.pending.lock().map_err(|_| "lock failed")?;
    *pending = Some(PendingAuth {
        state: state_value.clone(),
        code_verifier: code_verifier.clone(),
        provider: provider.clone(),
        created_at: Instant::now(),
    });
    drop(pending);

    let mut provider_state = state.provider.lock().map_err(|_| "lock failed")?;
    *provider_state = Some(provider.clone());
    drop(provider_state);

    persist_provider(&app, &provider).map_err(|err| err.to_string())?;
    persist_pending(
        &app,
        &PendingAuthRecord {
            state: state_value.clone(),
            code_verifier: code_verifier.clone(),
            provider: provider.clone(),
            created_at_epoch: now_epoch(),
        },
    )
    .map_err(|err| err.to_string())?;

    let authorization_url = build_authorization_url(&provider, &state_value, &code_challenge)
        .map_err(|err| err.to_string())?;

    Ok(PrepareLoginResponse {
        state: state_value,
        code_verifier,
        code_challenge,
        authorization_url,
    })
}

#[tauri::command]
pub async fn oauth_handle_callback(
    app: AppHandle,
    state: State<'_, AuthState>,
    url: String,
) -> Result<(), String> {
    let url = Url::parse(&url).map_err(|_| AuthError::InvalidRedirectUrl.to_string())?;
    handle_callback_url(&app, &state, url)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn oauth_refresh_if_needed(
    app: AppHandle,
    state: State<'_, AuthState>,
) -> Result<AuthStatus, String> {
    let provider = {
        let in_memory = state
            .provider
            .lock()
            .map_err(|_| "lock failed")?
            .clone();
        if let Some(provider) = in_memory {
            provider
        } else {
            let stored = load_provider(&app)
                .map_err(|err| err.to_string())?
                .ok_or(AuthError::ProviderConfigMissing)
                .map_err(|err| err.to_string())?;
            let mut provider_state = state.provider.lock().map_err(|_| "lock failed")?;
            *provider_state = Some(stored.clone());
            stored
        }
    };

    let Some(tokens) = load_tokens(&app).map_err(|err| err.to_string())? else {
        return Ok(AuthStatus {
            is_authenticated: false,
            expires_at: None,
        });
    };

    let now = now_epoch();
    if tokens.expires_at - now > REFRESH_WINDOW_SECS {
        return Ok(AuthStatus {
            is_authenticated: true,
            expires_at: Some(tokens.expires_at),
        });
    }

    let refresh_token = tokens
        .refresh_token
        .clone()
        .ok_or(AuthError::RefreshTokenMissing)
        .map_err(|err| err.to_string())?;

    let refreshed = refresh_tokens(&provider, &refresh_token)
        .await
        .map_err(|err| err.to_string())?;

    save_tokens(&app, &refreshed).map_err(|err| err.to_string())?;
    emit_auth_changed(&app, &refreshed);

    Ok(AuthStatus {
        is_authenticated: true,
        expires_at: Some(refreshed.expires_at),
    })
}

#[tauri::command]
pub fn oauth_logout(app: AppHandle) -> Result<(), String> {
    clear_tokens(&app).map_err(|err| err.to_string())?;
    let status = AuthStatus {
        is_authenticated: false,
        expires_at: None,
    };
    let _ = app.emit("auth:changed", status);
    Ok(())
}

#[tauri::command]
pub fn oauth_get_auth_state(app: AppHandle) -> Result<AuthStatus, String> {
    let tokens = load_tokens(&app).map_err(|err| err.to_string())?;
    let now = now_epoch();

    if let Some(tokens) = tokens {
        let is_authenticated = tokens.expires_at > now;
        Ok(AuthStatus {
            is_authenticated,
            expires_at: Some(tokens.expires_at),
        })
    } else {
        Ok(AuthStatus {
            is_authenticated: false,
            expires_at: None,
        })
    }
}

pub async fn handle_callback_url(
    app: &AppHandle,
    state: &State<'_, AuthState>,
    url: Url,
) -> Result<(), AuthError> {
    let guard = ProcessingGuard::lock(&state.processing)?;

    let callback_error = extract_query(&url, "error");
    let callback_error_description = extract_query(&url, "error_description");
    let returned_state = extract_query(&url, "state");
    let code = extract_query(&url, "code");

    if let Some(error_code) = callback_error {
        clear_pending(state, app)?;
        if returned_state.is_none() {
            return Err(AuthError::MissingState);
        }
        let description = callback_error_description
            .map(|value| format!("{error_code}: {value}"))
            .unwrap_or(error_code)
            .replace('+', " ");
        return Err(AuthError::AuthorizationDenied(description));
    }

    let code = match code {
        Some(value) => value,
        None => {
            clear_pending(state, app)?;
            return Err(AuthError::MissingCode);
        }
    };
    let returned_state = match returned_state {
        Some(value) => value,
        None => {
            clear_pending(state, app)?;
            return Err(AuthError::MissingState);
        }
    };

    let pending = consume_pending(state, app)?;

    if now_epoch() - pending.created_at_epoch > PENDING_TTL.as_secs() as i64 {
        return Err(AuthError::PendingExpired);
    }

    if pending.state != returned_state {
        clear_pending(state, app)?;
        return Err(AuthError::StateMismatch);
    }

    let token_set = exchange_code_for_token(&pending.provider, &code, &pending.code_verifier).await?;
    save_tokens(app, &token_set)?;
    persist_provider(app, &pending.provider)?;
    emit_auth_changed(app, &token_set);

    drop(guard);
    Ok(())
}

fn emit_auth_changed(app: &AppHandle, tokens: &TokenSet) {
    let status = AuthStatus {
        is_authenticated: true,
        expires_at: Some(tokens.expires_at),
    };
    let _ = app.emit("auth:changed", status);
}

fn build_authorization_url(
    provider: &ProviderConfig,
    state_value: &str,
    code_challenge: &str,
) -> Result<String, AuthError> {
    let mut url =
        Url::parse(&provider.authorization_endpoint).map_err(|_| AuthError::InvalidRedirectUrl)?;

    url.query_pairs_mut()
        .append_pair("response_type", "code")
        .append_pair("client_id", &provider.client_id)
        .append_pair("redirect_uri", &provider.redirect_uri)
        .append_pair("state", state_value)
        .append_pair("code_challenge", code_challenge)
        .append_pair("code_challenge_method", "S256");

    if !provider.scopes.is_empty() {
        url.query_pairs_mut()
            .append_pair("scope", &provider.scopes.join(" "));
    }

    if let Some(extra) = &provider.extra_auth_params {
        for (key, value) in extra {
            url.query_pairs_mut().append_pair(key, value);
        }
    }

    Ok(url.to_string())
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
}

async fn exchange_code_for_token(
    provider: &ProviderConfig,
    code: &str,
    code_verifier: &str,
) -> Result<TokenSet, AuthError> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|err| AuthError::Request(err.to_string()))?;

    let mut form: Vec<(String, String)> = vec![
        ("grant_type".to_string(), "authorization_code".to_string()),
        ("code".to_string(), code.to_string()),
        ("redirect_uri".to_string(), provider.redirect_uri.clone()),
        ("client_id".to_string(), provider.client_id.clone()),
        ("code_verifier".to_string(), code_verifier.to_string()),
    ];

    if let Some(secret) = &provider.client_secret {
        form.push(("client_secret".to_string(), secret.clone()));
    }

    if let Some(extra) = &provider.extra_token_params {
        for (key, value) in extra {
            form.push((key.clone(), value.clone()));
        }
    }

    let response = client
        .post(&provider.token_endpoint)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&form)
        .send()
        .await
        .map_err(|err| AuthError::Request(err.to_string()))?;

    if !response.status().is_success() {
        return Err(AuthError::TokenExchangeFailed(response.status()));
    }

    let token: TokenResponse = response
        .json()
        .await
        .map_err(|err| AuthError::Request(err.to_string()))?;

    let expires_in = token.expires_in.unwrap_or(3600);
    let expires_at = now_epoch() + expires_in;

    Ok(TokenSet {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at,
    })
}

async fn refresh_tokens(
    provider: &ProviderConfig,
    refresh_token: &str,
) -> Result<TokenSet, AuthError> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|err| AuthError::Request(err.to_string()))?;

    let mut form: Vec<(String, String)> = vec![
        ("grant_type".to_string(), "refresh_token".to_string()),
        ("refresh_token".to_string(), refresh_token.to_string()),
        ("client_id".to_string(), provider.client_id.clone()),
    ];

    if let Some(secret) = &provider.client_secret {
        form.push(("client_secret".to_string(), secret.clone()));
    }

    if let Some(extra) = &provider.extra_token_params {
        for (key, value) in extra {
            form.push((key.clone(), value.clone()));
        }
    }

    let response = client
        .post(&provider.token_endpoint)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&form)
        .send()
        .await
        .map_err(|err| AuthError::Request(err.to_string()))?;

    if !response.status().is_success() {
        return Err(AuthError::TokenExchangeFailed(response.status()));
    }

    let token: TokenResponse = response
        .json()
        .await
        .map_err(|err| AuthError::Request(err.to_string()))?;

    let expires_in = token.expires_in.unwrap_or(3600);
    let expires_at = now_epoch() + expires_in;

    Ok(TokenSet {
        access_token: token.access_token,
        refresh_token: token
            .refresh_token
            .or_else(|| Some(refresh_token.to_string())),
        expires_at,
    })
}

fn load_tokens(app: &AppHandle) -> Result<Option<TokenSet>, AuthError> {
    let entry = keyring::Entry::new(TOKEN_SERVICE, TOKEN_ACCOUNT)
        .map_err(|err| AuthError::Storage(err.to_string()))?;

    match entry.get_password() {
        Ok(json) => {
            let tokens = serde_json::from_str(&json)
                .map_err(|err| AuthError::Serialization(err.to_string()))?;
            Ok(Some(tokens))
        }
        Err(_) => load_tokens_store(app),
    }
}

fn save_tokens(app: &AppHandle, tokens: &TokenSet) -> Result<(), AuthError> {
    let json =
        serde_json::to_string(tokens).map_err(|err| AuthError::Serialization(err.to_string()))?;

    let entry = keyring::Entry::new(TOKEN_SERVICE, TOKEN_ACCOUNT)
        .map_err(|err| AuthError::Storage(err.to_string()))?;

    if entry.set_password(&json).is_ok() {
        return Ok(());
    }

    log::warn!("Keychain unavailable; falling back to tauri-plugin-store for tokens.");
    save_tokens_store(app, &json)
}

fn clear_tokens(app: &AppHandle) -> Result<(), AuthError> {
    if let Ok(entry) = keyring::Entry::new(TOKEN_SERVICE, TOKEN_ACCOUNT) {
        let _ = entry.delete_password();
    }
    clear_provider_store(app)?;
    clear_pending_store(app)?;
    clear_tokens_store(app)
}

fn persist_provider(app: &AppHandle, provider: &ProviderConfig) -> Result<(), AuthError> {
    let json = serde_json::to_string(provider)
        .map_err(|err| AuthError::Serialization(err.to_string()))?;
    let store = app
        .store(STORE_PATH)
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    store.set(STORE_PROVIDER_KEY, json);
    store
        .save()
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    Ok(())
}

fn load_provider(app: &AppHandle) -> Result<Option<ProviderConfig>, AuthError> {
    let store = app
        .store(STORE_PATH)
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    let Some(value) = store.get(STORE_PROVIDER_KEY) else {
        return Ok(None);
    };
    let json = value
        .as_str()
        .ok_or_else(|| AuthError::Serialization("invalid provider format".into()))?;
    let provider = serde_json::from_str::<ProviderConfig>(json)
        .map_err(|err| AuthError::Serialization(err.to_string()))?;
    Ok(Some(provider))
}

fn clear_provider_store(app: &AppHandle) -> Result<(), AuthError> {
    let store = app
        .store(STORE_PATH)
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    store.delete(STORE_PROVIDER_KEY);
    store
        .save()
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    Ok(())
}

fn persist_pending(app: &AppHandle, pending: &PendingAuthRecord) -> Result<(), AuthError> {
    let json = serde_json::to_string(pending)
        .map_err(|err| AuthError::Serialization(err.to_string()))?;
    let store = app
        .store(STORE_PATH)
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    store.set(STORE_PENDING_KEY, json);
    store
        .save()
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    Ok(())
}

fn load_pending_store(app: &AppHandle) -> Result<Option<PendingAuthRecord>, AuthError> {
    let store = app
        .store(STORE_PATH)
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    let Some(value) = store.get(STORE_PENDING_KEY) else {
        return Ok(None);
    };
    let json = value
        .as_str()
        .ok_or_else(|| AuthError::Serialization("invalid pending format".into()))?;
    let pending = serde_json::from_str::<PendingAuthRecord>(json)
        .map_err(|err| AuthError::Serialization(err.to_string()))?;
    Ok(Some(pending))
}

fn clear_pending_store(app: &AppHandle) -> Result<(), AuthError> {
    let store = app
        .store(STORE_PATH)
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    store.delete(STORE_PENDING_KEY);
    store
        .save()
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    Ok(())
}

fn consume_pending(state: &State<'_, AuthState>, app: &AppHandle) -> Result<PendingAuthRecord, AuthError> {
    let in_memory = state
        .pending
        .lock()
        .map_err(|_| AuthError::Storage("pending lock failed".into()))?
        .take();

    let pending = if let Some(pending) = in_memory {
        let elapsed = pending.created_at.elapsed().as_secs() as i64;
        PendingAuthRecord {
            state: pending.state,
            code_verifier: pending.code_verifier,
            provider: pending.provider,
            created_at_epoch: now_epoch().saturating_sub(elapsed),
        }
    } else {
        load_pending_store(app)?.ok_or(AuthError::NoPendingState)?
    };

    clear_pending_store(app)?;
    Ok(pending)
}

fn clear_pending(state: &State<'_, AuthState>, app: &AppHandle) -> Result<(), AuthError> {
    if let Ok(mut guard) = state.pending.lock() {
        *guard = None;
    }
    clear_pending_store(app)
}

fn load_tokens_store(app: &AppHandle) -> Result<Option<TokenSet>, AuthError> {
    let store = app
        .store(STORE_PATH)
        .map_err(|err| AuthError::Storage(err.to_string()))?;

    let Some(value) = store.get(STORE_KEY) else {
        return Ok(None);
    };

    let json = value
        .as_str()
        .ok_or_else(|| AuthError::Serialization("invalid token format".into()))?;

    let tokens =
        serde_json::from_str(json).map_err(|err| AuthError::Serialization(err.to_string()))?;
    Ok(Some(tokens))
}

fn save_tokens_store(app: &AppHandle, json: &str) -> Result<(), AuthError> {
    let store = app
        .store(STORE_PATH)
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    store.set(STORE_KEY, json);
    store
        .save()
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    Ok(())
}

fn clear_tokens_store(app: &AppHandle) -> Result<(), AuthError> {
    let store = app
        .store(STORE_PATH)
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    store.delete(STORE_KEY);
    store
        .save()
        .map_err(|err| AuthError::Storage(err.to_string()))?;
    Ok(())
}

fn random_urlsafe(size: usize) -> String {
    let mut buffer = vec![0u8; size];
    OsRng.fill_bytes(&mut buffer);
    URL_SAFE_NO_PAD.encode(buffer)
}

fn pkce_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let digest = hasher.finalize();
    URL_SAFE_NO_PAD.encode(digest)
}

fn extract_query(url: &Url, key: &str) -> Option<String> {
    url.query_pairs()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.to_string())
}

fn now_epoch() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

struct ProcessingGuard<'a> {
    lock: &'a Mutex<bool>,
}

impl<'a> ProcessingGuard<'a> {
    fn lock(lock: &'a Mutex<bool>) -> Result<Self, AuthError> {
        let mut guard = lock
            .lock()
            .map_err(|_| AuthError::Storage("processing lock failed".into()))?;
        if *guard {
            return Err(AuthError::Storage("callback already processing".into()));
        }
        *guard = true;
        Ok(Self { lock })
    }
}

impl Drop for ProcessingGuard<'_> {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.lock.lock() {
            *guard = false;
        }
    }
}
