use anyhow::{anyhow, Context, Result};
use parking_lot::Mutex;
use serde::Serialize;
use std::collections::VecDeque;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};

const LOG_CAP: usize = 500;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "kind", content = "detail")]
pub enum Status {
    Disconnected,
    Connecting,
    Connected,
    Failed(String),
}

pub struct XrayHandle {
    child: Child,
}

#[derive(Clone)]
pub struct XrayState {
    pub status: Arc<Mutex<Status>>,
    pub logs: Arc<Mutex<VecDeque<String>>>,
}

impl XrayState {
    pub fn new() -> Self {
        Self {
            status: Arc::new(Mutex::new(Status::Disconnected)),
            logs: Arc::new(Mutex::new(VecDeque::with_capacity(LOG_CAP))),
        }
    }

    pub fn push_log(&self, line: String) {
        let mut buf = self.logs.lock();
        if buf.len() >= LOG_CAP {
            buf.pop_front();
        }
        buf.push_back(line);
    }

    pub fn snapshot_logs(&self) -> Vec<String> {
        self.logs.lock().iter().cloned().collect()
    }

    pub fn current_status(&self) -> Status {
        self.status.lock().clone()
    }

    pub fn set_status(&self, s: Status) {
        *self.status.lock() = s;
    }

    pub fn clear_logs(&self) {
        self.logs.lock().clear();
    }
}

/// Spawn xray with the given config file. Returns a handle that, when dropped, kills the process.
pub async fn spawn(
    bin: &Path,
    config_path: &Path,
    state: XrayState,
) -> Result<XrayHandle> {
    if !bin.exists() {
        return Err(anyhow!(
            "xray binary not found at {} — run `npm run fetch-xray`",
            bin.display()
        ));
    }
    if !config_path.exists() {
        return Err(anyhow!("config not found at {}", config_path.display()));
    }

    state.clear_logs();
    state.set_status(Status::Connecting);
    state.push_log(format!(
        "[supervisor] starting {} -c {}",
        bin.display(),
        config_path.display()
    ));

    let mut cmd = Command::new(bin);
    cmd.arg("-c")
        .arg(config_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());

    // Set the working dir to the binary's folder so xray can find geoip.dat / geosite.dat.
    if let Some(parent) = bin.parent() {
        cmd.current_dir(parent);
    }

    #[cfg(windows)]
    {
        // CREATE_NO_WINDOW so xray doesn't pop a console behind the Tauri window.
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd.spawn().context("failed to spawn xray")?;

    let stdout = child.stdout.take().context("missing stdout")?;
    let stderr = child.stderr.take().context("missing stderr")?;

    spawn_log_pump(stdout, state.clone(), "stdout");
    spawn_log_pump(stderr, state.clone(), "stderr");

    // Promote Connecting -> Connected after a short grace period if the process is still alive.
    {
        let state = state.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(700)).await;
            let mut s = state.status.lock();
            if matches!(*s, Status::Connecting) {
                *s = Status::Connected;
            }
        });
    }

    Ok(XrayHandle { child })
}

fn spawn_log_pump<R>(stream: R, state: XrayState, tag: &'static str)
where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    tokio::spawn(async move {
        let mut reader = BufReader::new(stream).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            state.push_log(format!("[{}] {}", tag, line));
        }
    });
}

impl XrayHandle {
    /// Stop the process. Best-effort: kill, await exit.
    pub async fn stop(mut self) {
        let _ = self.child.start_kill();
        let _ = self.child.wait().await;
    }
}

impl Drop for XrayHandle {
    fn drop(&mut self) {
        let _ = self.child.start_kill();
    }
}

pub fn write_config(path: &PathBuf, value: &serde_json::Value) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let pretty = serde_json::to_string_pretty(value)?;
    std::fs::write(path, pretty).context("write xray config")?;
    Ok(())
}
