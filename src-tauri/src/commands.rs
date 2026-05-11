use crate::config;
use crate::paths::Paths;
use crate::proxy::{ProxyGuard, DEFAULT_BYPASS};
use crate::vless::VlessLink;
use crate::xray::{self, Status, XrayHandle, XrayState};
use parking_lot::Mutex;
use serde::Serialize;
use tauri::State;

pub struct AppState {
    pub paths: Paths,
    pub xray: Mutex<Option<XrayHandle>>,
    pub proxy: Mutex<Option<ProxyGuard>>,
    pub xray_state: XrayState,
}

impl AppState {
    pub fn new(paths: Paths) -> Self {
        Self {
            paths,
            xray: Mutex::new(None),
            proxy: Mutex::new(None),
            xray_state: XrayState::new(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ConnectionInfo {
    pub status: Status,
    pub remark: String,
    pub host: String,
    pub port: u16,
    pub network: String,
    pub security: String,
    pub socks_port: u16,
    pub http_port: u16,
}

#[derive(Debug, Serialize)]
pub struct EnvCheck {
    pub xray_path: String,
    pub xray_present: bool,
}

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

#[tauri::command]
pub async fn connect(
    url: String,
    state: State<'_, AppState>,
) -> Result<ConnectionInfo, String> {
    // If something is already running, tear it down first.
    inner_disconnect(&state).await;

    let link = VlessLink::parse(&url).map_err(err)?;
    let cfg = config::build(&link);
    xray::write_config(&state.paths.config_path, &cfg).map_err(err)?;

    let handle = xray::spawn(
        &state.paths.xray_bin,
        &state.paths.config_path,
        state.xray_state.clone(),
    )
    .await
    .map_err(|e| {
        state
            .xray_state
            .set_status(Status::Failed(e.to_string()));
        err(e)
    })?;
    *state.xray.lock() = Some(handle);

    let server = format!("127.0.0.1:{}", config::HTTP_PORT);
    let guard = ProxyGuard::set(&server, DEFAULT_BYPASS).map_err(|e| {
        // If proxy registry write failed, kill xray to leave a clean state.
        if let Some(h) = state.xray.lock().take() {
            tokio::spawn(async move { h.stop().await });
        }
        state
            .xray_state
            .set_status(Status::Failed(format!("system proxy: {e}")));
        err(e)
    })?;
    *state.proxy.lock() = Some(guard);

    Ok(ConnectionInfo {
        status: state.xray_state.current_status(),
        remark: link.remark,
        host: link.host,
        port: link.port,
        network: link.network,
        security: link.security,
        socks_port: config::SOCKS_PORT,
        http_port: config::HTTP_PORT,
    })
}

async fn inner_disconnect(state: &State<'_, AppState>) {
    // Drop the proxy guard FIRST so the user is unproxied even if xray hangs on shutdown.
    let proxy = state.proxy.lock().take();
    if let Some(mut guard) = proxy {
        let _ = guard.restore();
    }
    // Bind to a local so the parking_lot guard is dropped before the .await below.
    let handle = state.xray.lock().take();
    if let Some(h) = handle {
        h.stop().await;
    }
    state.xray_state.set_status(Status::Disconnected);
}

#[tauri::command]
pub async fn disconnect(state: State<'_, AppState>) -> Result<(), String> {
    inner_disconnect(&state).await;
    Ok(())
}

#[tauri::command]
pub fn get_status(state: State<'_, AppState>) -> Status {
    state.xray_state.current_status()
}

#[tauri::command]
pub fn get_logs(state: State<'_, AppState>) -> Vec<String> {
    state.xray_state.snapshot_logs()
}

#[tauri::command]
pub fn env_check(state: State<'_, AppState>) -> EnvCheck {
    let path = state.paths.xray_bin.clone();
    EnvCheck {
        xray_present: path.exists(),
        xray_path: path.display().to_string(),
    }
}
