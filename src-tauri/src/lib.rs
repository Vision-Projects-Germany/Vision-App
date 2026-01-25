use serde::{Deserialize, Serialize};
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
            auth::oauth_prepare_login,
            auth::oauth_handle_callback,
            auth::oauth_refresh_if_needed,
            auth::oauth_logout,
            auth::oauth_get_auth_state,
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
