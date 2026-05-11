mod commands;
mod config;
mod paths;
mod proxy;
mod vless;
mod xray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_title("Drift · 随心畅连");
            }
            let paths = paths::Paths::from_app(app.handle())?;
            app.manage(commands::AppState::new(paths));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::connect,
            commands::disconnect,
            commands::get_status,
            commands::get_logs,
            commands::env_check,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
