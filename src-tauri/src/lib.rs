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
            let state = commands::AppState::new(paths);

            // A crash or task-kill leaves the system proxy pointing at our dead
            // HTTP inbound, blackholing all traffic until the next connect.
            // Clear it, but only while nothing listens there: another Drift
            // copy (the installed build next to `tauri dev`) may be serving it.
            let port_free =
                std::net::TcpListener::bind(("127.0.0.1", config::HTTP_PORT)).is_ok();
            let server = config::http_proxy_server();
            if port_free && proxy::clear_stale(&server) {
                state.xray_state.push_log(format!(
                    "[supervisor] cleared stale system proxy {server} left by a previous run"
                ));
            }

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::connect,
            commands::disconnect,
            commands::get_status,
            commands::get_logs,
            commands::probe_latency,
            commands::env_check,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
