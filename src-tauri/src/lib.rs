use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::collections::HashMap;
use tauri::Manager;

mod auth;
mod deeplink;

#[derive(Serialize)]
struct AppInfo {
    name: String,
    version: String,
}

#[derive(Deserialize)]
struct HttpRequest {
    method: String,
    url: String,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
}

#[derive(Serialize)]
struct HttpResponse {
    status: u16,
    body: String,
}

#[derive(Deserialize)]
struct DiscordPresencePayload {
    state: Option<String>,
    startTimestamp: Option<i64>,
    endTimestamp: Option<i64>,
    largeImageKey: Option<String>,
    largeImageText: Option<String>,
    smallImageKey: Option<String>,
    smallImageText: Option<String>,
    partyId: Option<String>,
    joinSecret: Option<String>,
}

static DISCORD_CLIENT: OnceLock<Mutex<Option<DiscordIpcClient>>> = OnceLock::new();

fn discord_client() -> &'static Mutex<Option<DiscordIpcClient>> {
    DISCORD_CLIENT.get_or_init(|| Mutex::new(None))
}

fn normalize_timestamp(value: i64) -> i64 {
    if value < 1_000_000_000_000 {
        value * 1000
    } else {
        value
    }
}

#[tauri::command]
fn discord_update_presence(app_id: String, presence: DiscordPresencePayload) -> Result<(), String> {
    let mut guard = discord_client()
        .lock()
        .map_err(|_| "discord client lock failed")?;

    if guard.is_none() {
        let mut client = DiscordIpcClient::new(&app_id);
        client
            .connect()
            .map_err(|error| format!("discord connect failed: {error}"))?;
        *guard = Some(client);
    }

    let client = guard
        .as_mut()
        .ok_or_else(|| "discord client missing".to_string())?;

    let mut activity = activity::Activity::new();

    if let Some(state) = presence.state.as_deref() {
        activity = activity.state(state);
    }

    if presence.startTimestamp.is_some() || presence.endTimestamp.is_some() {
        let mut timestamps = activity::Timestamps::new();
        if let Some(start) = presence.startTimestamp {
            timestamps = timestamps.start(normalize_timestamp(start));
        }
        if let Some(end) = presence.endTimestamp {
            timestamps = timestamps.end(normalize_timestamp(end));
        }
        activity = activity.timestamps(timestamps);
    }

    if presence.largeImageKey.is_some()
        || presence.largeImageText.is_some()
        || presence.smallImageKey.is_some()
        || presence.smallImageText.is_some()
    {
        let mut assets = activity::Assets::new();
        if let Some(large_key) = presence.largeImageKey.as_deref() {
            assets = assets.large_image(large_key);
        }
        if let Some(large_text) = presence.largeImageText.as_deref() {
            assets = assets.large_text(large_text);
        }
        if let Some(small_key) = presence.smallImageKey.as_deref() {
            assets = assets.small_image(small_key);
        }
        if let Some(small_text) = presence.smallImageText.as_deref() {
            assets = assets.small_text(small_text);
        }
        activity = activity.assets(assets);
    }

    if let Some(party_id) = presence.partyId.as_deref() {
        let party = activity::Party::new().id(party_id);
        activity = activity.party(party);
    }

    if let Some(join_secret) = presence.joinSecret.as_deref() {
        let secrets = activity::Secrets::new().join(join_secret);
        activity = activity.secrets(secrets);
    }

    client
        .set_activity(activity)
        .map_err(|error| format!("discord update failed: {error}"))?;

    Ok(())
}

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        name: "Vision Desktop".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[tauri::command]
async fn http_request(request: HttpRequest) -> Result<HttpResponse, String> {
    let method = request
        .method
        .parse()
        .map_err(|error| format!("invalid method: {error}"))?;
    let client = reqwest::Client::new();
    let mut builder = client.request(method, &request.url);

    if let Some(headers) = request.headers {
        for (key, value) in headers {
            builder = builder.header(&key, value);
        }
    }

    if let Some(body) = request.body {
        builder = builder.body(body);
    }

    let response = builder
        .send()
        .await
        .map_err(|error| format!("request failed: {error}"))?;
    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|error| format!("response read failed: {error}"))?;

    Ok(HttpResponse { status, body })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            http_request,
            discord_update_presence,
            auth::oauth_prepare_login,
            auth::oauth_handle_callback,
            auth::oauth_refresh_if_needed,
            auth::oauth_logout,
            auth::oauth_get_auth_state,
            auth::oauth_get_access_token,
            deeplink::deeplink_get_current_route
        ])
        .setup(|app| {
            app.manage(auth::AuthState::new());
            app.manage(deeplink::DeepLinkState::new());
            deeplink::setup_deeplinks(app.handle());
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
