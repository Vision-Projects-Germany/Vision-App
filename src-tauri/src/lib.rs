use serde::Serialize;
use tauri::Manager;

mod auth;
mod deeplink;

#[derive(Serialize)]
struct AppInfo {
    name: String,
    version: String,
}

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        name: "Vision Desktop".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    }
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
