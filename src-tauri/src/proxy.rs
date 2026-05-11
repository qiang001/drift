// System proxy: Windows uses HKCU Internet Settings + WM_SETTINGCHANGE broadcast;
// macOS uses `networksetup` against every active network service. ProxyGuard restores
// the prior state on Drop — covers normal disconnect, app exit, and panic, which is
// critical for not stranding the user behind a dead proxy.

use anyhow::Result;

pub const DEFAULT_BYPASS: &str = "localhost;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*;<local>";

#[cfg(target_os = "windows")]
mod imp {
    use super::*;
    use anyhow::Context;
    use windows_sys::Win32::Networking::WinInet::{
        InternetSetOptionW, INTERNET_OPTION_REFRESH, INTERNET_OPTION_SETTINGS_CHANGED,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        SendMessageTimeoutW, HWND_BROADCAST, SMTO_ABORTIFHUNG, WM_SETTINGCHANGE,
    };
    use winreg::enums::*;
    use winreg::RegKey;

    const KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Internet Settings";

    #[derive(Debug, Clone)]
    struct PriorState {
        proxy_enable: u32,
        proxy_server: Option<String>,
        proxy_override: Option<String>,
    }

    pub struct ProxyGuard {
        prior: Option<PriorState>,
        armed: bool,
    }

    impl ProxyGuard {
        pub fn set(server: &str, bypass: &str) -> Result<Self> {
            let prior = read_state().context("read prior proxy state")?;
            write_state(1, Some(server), Some(bypass)).context("apply proxy state")?;
            notify_change();
            Ok(Self {
                prior: Some(prior),
                armed: true,
            })
        }

        pub fn restore(&mut self) -> Result<()> {
            if let Some(p) = self.prior.take() {
                write_state(
                    p.proxy_enable,
                    p.proxy_server.as_deref(),
                    p.proxy_override.as_deref(),
                )?;
                notify_change();
            }
            self.armed = false;
            Ok(())
        }
    }

    impl Drop for ProxyGuard {
        fn drop(&mut self) {
            if self.armed {
                let _ = self.restore();
            }
        }
    }

    fn read_state() -> Result<PriorState> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let key = hkcu.open_subkey_with_flags(KEY, KEY_READ)?;
        let proxy_enable: u32 = key.get_value("ProxyEnable").unwrap_or(0);
        let proxy_server: Option<String> = key.get_value("ProxyServer").ok();
        let proxy_override: Option<String> = key.get_value("ProxyOverride").ok();
        Ok(PriorState {
            proxy_enable,
            proxy_server,
            proxy_override,
        })
    }

    fn write_state(enable: u32, server: Option<&str>, bypass: Option<&str>) -> Result<()> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _) = hkcu.create_subkey_with_flags(KEY, KEY_WRITE)?;
        key.set_value("ProxyEnable", &enable)?;
        match server {
            Some(s) => {
                key.set_value("ProxyServer", &s.to_string())?;
            }
            None => {
                let _ = key.delete_value("ProxyServer");
            }
        }
        match bypass {
            Some(s) => {
                key.set_value("ProxyOverride", &s.to_string())?;
            }
            None => {
                let _ = key.delete_value("ProxyOverride");
            }
        }
        Ok(())
    }

    fn notify_change() {
        unsafe {
            InternetSetOptionW(
                std::ptr::null_mut() as _,
                INTERNET_OPTION_SETTINGS_CHANGED,
                std::ptr::null(),
                0,
            );
            InternetSetOptionW(
                std::ptr::null_mut() as _,
                INTERNET_OPTION_REFRESH,
                std::ptr::null(),
                0,
            );
            let lparam: Vec<u16> = "Internet Settings\0".encode_utf16().collect();
            let mut result: usize = 0;
            SendMessageTimeoutW(
                HWND_BROADCAST,
                WM_SETTINGCHANGE,
                0,
                lparam.as_ptr() as isize,
                SMTO_ABORTIFHUNG,
                5000,
                &mut result,
            );
        }
    }
}

#[cfg(target_os = "macos")]
mod imp {
    use super::*;
    use anyhow::Context;
    use std::process::Command;

    const NETWORKSETUP: &str = "/usr/sbin/networksetup";

    #[derive(Debug, Clone)]
    struct ProxyState {
        enabled: bool,
        server: String,
        port: u16,
    }

    #[derive(Debug, Clone)]
    struct ServiceState {
        name: String,
        web: ProxyState,
        secure: ProxyState,
    }

    pub struct ProxyGuard {
        prior: Vec<ServiceState>,
        armed: bool,
    }

    impl ProxyGuard {
        pub fn set(server: &str, _bypass: &str) -> Result<Self> {
            let (host, port_s) = server
                .rsplit_once(':')
                .ok_or_else(|| anyhow::anyhow!("invalid server: {server}"))?;
            let _: u16 = port_s.parse().context("parse port")?;

            let services = list_active_services().context("list network services")?;
            if services.is_empty() {
                anyhow::bail!("no active network services found");
            }

            let mut prior = Vec::with_capacity(services.len());
            for svc in &services {
                prior.push(read_service_state(svc).with_context(|| format!("read state of {svc}"))?);
            }

            for svc in &services {
                apply_proxy(svc, host, port_s).with_context(|| format!("apply proxy to {svc}"))?;
            }

            Ok(Self { prior, armed: true })
        }

        pub fn restore(&mut self) -> Result<()> {
            for st in &self.prior {
                restore_service(st);
            }
            self.armed = false;
            Ok(())
        }
    }

    impl Drop for ProxyGuard {
        fn drop(&mut self) {
            if self.armed {
                let _ = self.restore();
            }
        }
    }

    fn networksetup(args: &[&str]) -> Result<String> {
        let out = Command::new(NETWORKSETUP)
            .args(args)
            .output()
            .context("run networksetup")?;
        if !out.status.success() {
            anyhow::bail!(
                "networksetup {} failed: {}",
                args.join(" "),
                String::from_utf8_lossy(&out.stderr).trim()
            );
        }
        Ok(String::from_utf8_lossy(&out.stdout).to_string())
    }

    fn list_active_services() -> Result<Vec<String>> {
        let out = networksetup(&["-listallnetworkservices"])?;
        // Output starts with a notice line; disabled services are prefixed with `*`.
        Ok(out
            .lines()
            .skip(1)
            .map(str::trim)
            .filter(|l| !l.is_empty() && !l.starts_with('*'))
            .map(String::from)
            .collect())
    }

    fn parse_proxy_output(s: &str) -> ProxyState {
        let mut state = ProxyState {
            enabled: false,
            server: String::new(),
            port: 0,
        };
        for line in s.lines() {
            let line = line.trim();
            if let Some(v) = line.strip_prefix("Enabled: ") {
                state.enabled = v == "Yes";
            } else if let Some(v) = line.strip_prefix("Server: ") {
                state.server = v.to_string();
            } else if let Some(v) = line.strip_prefix("Port: ") {
                state.port = v.parse().unwrap_or(0);
            }
        }
        state
    }

    fn read_service_state(service: &str) -> Result<ServiceState> {
        let web = parse_proxy_output(&networksetup(&["-getwebproxy", service])?);
        let secure = parse_proxy_output(&networksetup(&["-getsecurewebproxy", service])?);
        Ok(ServiceState {
            name: service.to_string(),
            web,
            secure,
        })
    }

    fn apply_proxy(service: &str, host: &str, port: &str) -> Result<()> {
        networksetup(&["-setwebproxy", service, host, port])?;
        networksetup(&["-setsecurewebproxy", service, host, port])?;
        Ok(())
    }

    fn restore_service(st: &ServiceState) {
        // Web proxy
        if st.web.enabled && !st.web.server.is_empty() && st.web.port > 0 {
            let port = st.web.port.to_string();
            let _ = networksetup(&["-setwebproxy", &st.name, &st.web.server, &port]);
        } else {
            let _ = networksetup(&["-setwebproxystate", &st.name, "off"]);
        }
        // Secure (HTTPS) proxy
        if st.secure.enabled && !st.secure.server.is_empty() && st.secure.port > 0 {
            let port = st.secure.port.to_string();
            let _ = networksetup(&["-setsecurewebproxy", &st.name, &st.secure.server, &port]);
        } else {
            let _ = networksetup(&["-setsecurewebproxystate", &st.name, "off"]);
        }
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
mod imp {
    use super::*;
    pub struct ProxyGuard;
    impl ProxyGuard {
        pub fn set(_server: &str, _bypass: &str) -> Result<Self> {
            anyhow::bail!("system proxy is only implemented for Windows and macOS in this build")
        }
        pub fn restore(&mut self) -> Result<()> {
            Ok(())
        }
    }
}

pub use imp::ProxyGuard;
