use anyhow::{Context, Result};
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

pub struct Paths {
    pub xray_bin: PathBuf,
    pub config_path: PathBuf,
}

fn resource_path(app: &AppHandle, rel: &str) -> PathBuf {
    if let Ok(p) = app.path().resolve(rel, BaseDirectory::Resource) {
        if p.exists() {
            return p;
        }
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(rel)
}

impl Paths {
    pub fn from_app(app: &AppHandle) -> Result<Self> {
        let xray_dir = resource_path(app, "binaries/xray");
        let bin_name = if cfg!(windows) { "xray.exe" } else { "xray" };
        let xray_bin = xray_dir.join(bin_name);

        let data_dir = app.path().app_local_data_dir().context("app_local_data_dir")?;
        std::fs::create_dir_all(&data_dir).ok();
        let config_path = data_dir.join("xray-config.json");

        Ok(Self {
            xray_bin,
            config_path,
        })
    }
}
