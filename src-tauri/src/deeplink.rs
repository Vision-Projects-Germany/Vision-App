use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_deep_link::DeepLinkExt;
use url::Url;

use crate::auth;

const SCHEME: &str = "vision";
const CALLBACK_HOST: &str = "auth";
const CALLBACK_PATH: &str = "/callback";

pub struct DeepLinkState {
    last_route: Mutex<Option<String>>,
}

impl DeepLinkState {
    pub fn new() -> Self {
        Self {
            last_route: Mutex::new(None),
        }
    }

    fn set_route(&self, route: Option<String>) {
        if let Ok(mut guard) = self.last_route.lock() {
            *guard = route;
        }
    }

    fn get_route(&self) -> Option<String> {
        self.last_route.lock().ok().and_then(|guard| guard.clone())
    }
}

#[tauri::command]
pub fn deeplink_get_current_route(state: State<'_, DeepLinkState>) -> Option<String> {
    state.get_route()
}

pub fn setup_deeplinks(app: &AppHandle) {
    let app_handle = app.clone();

    app.deep_link().on_open_url(move |event| {
        let app = app_handle.clone();
        let urls = event.urls().to_vec();
        tauri::async_runtime::spawn(async move {
            for url in urls {
                if is_oauth_callback(&url) {
                    let state = app.state::<auth::AuthState>();
                    if let Err(err) = auth::handle_callback_url(&app, &state, url).await {
                        let _ = app.emit("auth:error", err.to_string());
                    }
                    focus_main_window(&app);
                } else if let Some(route) = extract_route(&url) {
                    let state = app.state::<DeepLinkState>();
                    state.set_route(Some(route.clone()));
                    let _ = app.emit("app:navigate", route);
                    focus_main_window(&app);
                }
            }
        });
    });

    // Handle deeplinks when the app launches (macOS/iOS/Android).
    if let Ok(Some(urls)) = app.deep_link().get_current() {
        for url in urls {
            if is_oauth_callback(&url) {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let state = app.state::<auth::AuthState>();
                    if let Err(err) = auth::handle_callback_url(&app, &state, url).await {
                        let _ = app.emit("auth:error", err.to_string());
                    }
                    focus_main_window(&app);
                });
            } else if let Some(route) = extract_route(&url) {
                let state = app.state::<DeepLinkState>();
                state.set_route(Some(route.clone()));
                let _ = app.emit("app:navigate", route);
            }
        }
    }

    // Handle deeplinks passed as CLI arguments (Windows/Linux).
    app.deep_link().handle_cli_arguments(std::env::args());
}

/// When running as a single-instance app on Windows/Linux, deep links are delivered to the already
/// running process via the single-instance callback args. We need to parse and handle them here,
/// otherwise OAuth callbacks won't be processed if the app was already open.
pub fn handle_single_instance_args(app: &AppHandle, args: Vec<String>) {
    let app_handle = app.clone();

    tauri::async_runtime::spawn(async move {
        for raw in args {
            let candidate = raw.trim_matches('"').trim().to_string();
            if !candidate.starts_with("vision:") {
                continue;
            }

            let url = match Url::parse(&candidate) {
                Ok(value) => value,
                Err(_) => continue,
            };

            if is_oauth_callback(&url) {
                let state = app_handle.state::<auth::AuthState>();
                if let Err(err) = auth::handle_callback_url(&app_handle, &state, url).await {
                    let _ = app_handle.emit("auth:error", err.to_string());
                }
                focus_main_window(&app_handle);
            } else if let Some(route) = extract_route(&url) {
                let state = app_handle.state::<DeepLinkState>();
                state.set_route(Some(route.clone()));
                let _ = app_handle.emit("app:navigate", route);
                focus_main_window(&app_handle);
            }
        }
    });
}

fn is_oauth_callback(url: &Url) -> bool {
    url.scheme() == SCHEME && url.host_str() == Some(CALLBACK_HOST) && url.path() == CALLBACK_PATH
}

fn extract_route(url: &Url) -> Option<String> {
    if url.scheme() != SCHEME {
        return None;
    }

    let host = url.host_str().unwrap_or_default();
    let path = url.path().trim_matches('/');

    let route = if !host.is_empty() && host != CALLBACK_HOST {
        host
    } else {
        path
    };

    match route {
        "home"
        | "projects"
        | "news"
        | "explore"
        | "media"
        | "settings"
        | "settings-debug"
        | "profile"
        | "editor"
        | "analytics"
        | "calendar"
        | "admin"
        | "roles"
        | "members" => Some(route.to_string()),
        _ => None,
    }
}

fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

// Platform registration notes:
// - Windows: requires protocol registration in the installer (MSI/NSIS).
// - macOS: Info.plist CFBundleURLTypes must include the "vision" scheme.
// - Linux: add a .desktop file with MimeType=x-scheme-handler/vision.
