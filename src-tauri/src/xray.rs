use crate::config::{HTTP_PORT, PROBE_HOST, SOCKS_PORT};
use anyhow::{anyhow, Context, Result};
use parking_lot::Mutex;
use serde::Serialize;
use std::collections::VecDeque;
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tokio::process::Command;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;

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
    stop_tx: Option<oneshot::Sender<()>>,
    watcher: Option<JoinHandle<()>>,
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

    // If an inbound port is taken, xray fails with an unreadable
    // "bind: Only one usage of each socket address". The usual cause is an
    // orphaned xray left behind by a run that crashed or was task-killed, so
    // reap ours and re-check; anything still holding the port belongs to other
    // software and becomes an error the user can act on.
    if let Some((port, label)) = busy_inbound() {
        state.push_log(format!(
            "[supervisor] {} port {} busy — reaping orphaned xray processes",
            label, port
        ));
        reap_orphans(bin, &state);

        // Windows frees the port a moment after the process dies, so an
        // immediate re-check can still see it busy.
        if let Some((port, label)) = wait_inbound_free(Duration::from_secs(3)).await {
            let msg = format!(
                "{} port {} is already in use by another program \
                 (another proxy client such as v2rayN or Clash, or another \
                 copy of Drift, also uses 10808) — close it and try again.",
                label, port
            );
            state.set_status(Status::Failed(msg.clone()));
            return Err(anyhow!(msg));
        }
    }
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
    #[cfg(windows)]
    bind_to_app_lifetime(&child, &state);

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

    // Watcher: select between stop signal and child exit. If xray dies on its own,
    // mark Failed (with last log line as hint) so the UI doesn't keep showing Connected.
    let (stop_tx, stop_rx) = oneshot::channel::<()>();
    let watcher_state = state.clone();
    let watcher = tokio::spawn(async move {
        tokio::select! {
            _ = stop_rx => {
                let _ = child.start_kill();
                let _ = child.wait().await;
            }
            res = child.wait() => {
                let last_log = watcher_state
                    .logs
                    .lock()
                    .iter()
                    .rev()
                    .find(|l| !l.trim().is_empty())
                    .cloned()
                    .unwrap_or_else(|| "(no output)".into());
                let detail = match res {
                    Ok(status) => format!("xray exited ({status}): {last_log}"),
                    Err(e) => format!("xray wait failed: {e}"),
                };
                watcher_state.push_log(format!("[supervisor] {detail}"));
                watcher_state.set_status(Status::Failed(detail));
            }
        }
    });

    Ok(XrayHandle {
        stop_tx: Some(stop_tx),
        watcher: Some(watcher),
    })
}

/// First inbound port that cannot be bound, with a label for messages.
fn busy_inbound() -> Option<(u16, &'static str)> {
    [(SOCKS_PORT, "SOCKS"), (HTTP_PORT, "HTTP")]
        .into_iter()
        .find(|(port, _)| TcpListener::bind(("127.0.0.1", *port)).is_err())
}

/// Poll until both inbound ports are free; returns the one still busy at the deadline.
async fn wait_inbound_free(timeout: Duration) -> Option<(u16, &'static str)> {
    let deadline = Instant::now() + timeout;
    loop {
        let busy = busy_inbound();
        if busy.is_none() || Instant::now() >= deadline {
            return busy;
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}

/// Put xray in a kill-on-close job object whose handle lives as long as Drift.
/// However Drift exits — quit, crash, task-kill, a `tauri dev` rebuild —
/// Windows closes the handle and takes xray down with it, instead of leaving
/// an orphan holding the inbound ports.
#[cfg(windows)]
fn bind_to_app_lifetime(child: &tokio::process::Child, state: &XrayState) {
    use std::sync::OnceLock;
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::JobObjects::{
        AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
        SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    };

    // HANDLE is a raw pointer (not Sync), so keep it as usize; 0 = creation failed.
    // Never closed on purpose: process exit closing it is what kills xray.
    static JOB: OnceLock<usize> = OnceLock::new();
    let job = *JOB.get_or_init(|| unsafe {
        let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if job.is_null() {
            return 0;
        }
        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let ok = SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &info as *const _ as *const _,
            std::mem::size_of_val(&info) as u32,
        );
        if ok == 0 {
            CloseHandle(job);
            return 0;
        }
        job as usize
    });

    let assigned = match child.raw_handle() {
        Some(h) if job != 0 => unsafe { AssignProcessToJobObject(job as _, h as _) != 0 },
        _ => false,
    };
    if !assigned {
        state.push_log(format!(
            "[supervisor] could not tie xray to app lifetime ({}); it may outlive a crash",
            std::io::Error::last_os_error()
        ));
    }
}

/// Kill leftover xray processes started from `bin`. Matching on the full
/// executable path keeps this from touching an unrelated xray the user runs
/// themselves. Best-effort: failures only mean the port stays busy and the
/// caller reports that.
fn reap_orphans(bin: &Path, state: &XrayState) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;

        // Tauri canonicalizes the exe path, so `bin` arrives as `\\?\C:\...`
        // while Win32_Process reports plain `C:\...`; strip the verbatim
        // prefix or the match never hits. (-eq is already case-insensitive.)
        let path = bin.to_string_lossy();
        let path = path.strip_prefix(r"\\?\").unwrap_or(&path);
        // Single-quoted PowerShell literal; '' escapes an embedded quote.
        let path = path.replace('\'', "''");
        let script = format!(
            "Get-CimInstance Win32_Process -Filter \"Name='xray.exe'\" | \
             Where-Object {{ $_.ExecutablePath -eq '{path}' }} | \
             ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force; $_.ProcessId }}"
        );

        let out = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        match out {
            Ok(o) if o.status.success() => {
                let pids = String::from_utf8_lossy(&o.stdout);
                let pids: Vec<&str> = pids.split_whitespace().collect();
                state.push_log(if pids.is_empty() {
                    "[supervisor] orphan reap: no xray of ours found".into()
                } else {
                    format!("[supervisor] orphan reap: killed pid {}", pids.join(", "))
                });
            }
            Ok(o) => state.push_log(format!(
                "[supervisor] orphan reap failed: {}",
                String::from_utf8_lossy(&o.stderr).trim()
            )),
            Err(e) => state.push_log(format!("[supervisor] orphan reap failed: {e}")),
        }
    }

    #[cfg(not(windows))]
    {
        let out = std::process::Command::new("pkill")
            .args(["-f", &bin.to_string_lossy()])
            .output();
        if let Err(e) = out {
            state.push_log(format!("[supervisor] orphan reap failed: {e}"));
        }
    }
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
    /// Stop the process. Signals the watcher to kill xray, then awaits cleanup.
    pub async fn stop(mut self) {
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.send(());
        }
        if let Some(w) = self.watcher.take() {
            let _ = w.await;
        }
    }
}

impl Drop for XrayHandle {
    fn drop(&mut self) {
        // Best-effort: signal the watcher; it owns the Child and will kill it.
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.send(());
        }
    }
}

/// Measure real latency: one HTTP request through our own HTTP inbound to
/// PROBE_HOST, which routing pins to the proxy outbound. A fresh connection
/// each time, so the number includes xray dialing the node (the "real delay"
/// other clients report) and a dead node fails instead of riding a stale
/// keep-alive or the direct path.
pub async fn probe_latency(timeout: Duration) -> Result<u32> {
    let start = Instant::now();
    let run = async {
        let mut s = TcpStream::connect(("127.0.0.1", HTTP_PORT))
            .await
            .context("connect local inbound")?;
        let req = format!(
            "GET http://{PROBE_HOST}/generate_204 HTTP/1.1\r\n\
             Host: {PROBE_HOST}\r\n\
             Connection: close\r\n\r\n"
        );
        s.write_all(req.as_bytes()).await?;

        // Only the status line matters: "HTTP/1.1 204 ...".
        let mut buf = Vec::with_capacity(64);
        let mut chunk = [0u8; 64];
        while !buf.contains(&b'\n') {
            let n = s.read(&mut chunk).await?;
            if n == 0 {
                return Err(anyhow!("connection closed by xray (node unreachable?)"));
            }
            buf.extend_from_slice(&chunk[..n]);
        }
        let head = String::from_utf8_lossy(&buf);
        let line = head.lines().next().unwrap_or("");
        match line.split_whitespace().nth(1) {
            Some("204") | Some("200") => Ok(()),
            _ => Err(anyhow!("unexpected probe response: {line}")),
        }
    };
    tokio::time::timeout(timeout, run)
        .await
        .map_err(|_| anyhow!("probe timed out"))??;
    Ok(start.elapsed().as_millis() as u32)
}

pub fn write_config(path: &PathBuf, value: &serde_json::Value) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let pretty = serde_json::to_string_pretty(value)?;
    std::fs::write(path, pretty).context("write xray config")?;
    Ok(())
}
