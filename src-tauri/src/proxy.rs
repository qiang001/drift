// Windows system proxy: set HKCU Internet Settings keys, broadcast WM_SETTINGCHANGE,
// and refresh WinINET. ProxyGuard restores the prior state on Drop — covers normal
// disconnect, app exit, and panic, which is critical for not stranding the user behind
// a dead proxy.

use anyhow::Result;

pub const DEFAULT_BYPASS: &str = "localhost;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*;<local>";

#[cfg(windows)]
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
            // Refresh WinINET-based apps (IE/Edge legacy, anything reading via WinINET).
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
            // Broadcast WM_SETTINGCHANGE so non-WinINET apps re-read the registry.
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

#[cfg(not(windows))]
mod imp {
    use super::*;
    pub struct ProxyGuard;
    impl ProxyGuard {
        pub fn set(_server: &str, _bypass: &str) -> Result<Self> {
            anyhow::bail!("system proxy support is only implemented for Windows in this build")
        }
        pub fn restore(&mut self) -> Result<()> {
            Ok(())
        }
    }
}

pub use imp::ProxyGuard;
