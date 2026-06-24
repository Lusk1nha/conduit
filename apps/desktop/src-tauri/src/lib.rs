//! Conduit desktop application core.
//!
//! This is the Tauri entry point. As the app grows it will follow the same
//! DDD layering as the rest of the workspace (`domain`, `application`,
//! `infrastructure`, `commands`); for the basic shell it exposes a single
//! `app_info` command so the React frontend can prove the IPC bridge works.

use serde::Serialize;

/// Application/runtime info surfaced to the frontend over IPC.
#[derive(Serialize)]
struct AppInfo {
    name: String,
    version: String,
    tauri: String,
}

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        name: "Conduit".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        tauri: tauri::VERSION.to_string(),
    }
}

/// Builds and runs the Tauri application.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_info])
        .run(tauri::generate_context!())
        .expect("error while running Conduit");
}
