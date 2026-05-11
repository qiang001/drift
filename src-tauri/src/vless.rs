use anyhow::{anyhow, Context, Result};
use std::collections::HashMap;
use url::Url;

#[derive(Debug, Clone)]
pub struct VlessLink {
    pub uuid: String,
    pub host: String,
    pub port: u16,
    pub remark: String,

    pub network: String,   // tcp | ws | grpc | http | httpupgrade | kcp | quic
    pub security: String,  // none | tls | reality
    pub flow: Option<String>,

    pub sni: Option<String>,
    pub alpn: Vec<String>,
    pub fingerprint: Option<String>,
    pub allow_insecure: bool,

    pub public_key: Option<String>, // reality pbk
    pub short_id: Option<String>,   // reality sid
    pub spider_x: Option<String>,   // reality spx

    pub path: Option<String>,         // ws / httpupgrade / h2 path
    pub host_header: Option<String>,  // ws Host header
    pub service_name: Option<String>, // grpc serviceName
    pub grpc_mode: Option<String>,    // grpc mode (gun | multi)
    pub header_type: Option<String>,  // tcp http obfs
}

impl VlessLink {
    pub fn parse(link: &str) -> Result<Self> {
        let trimmed = link.trim();
        if !trimmed.starts_with("vless://") {
            return Err(anyhow!("not a vless:// URL"));
        }
        let url = Url::parse(trimmed).context("invalid URL")?;

        let uuid = url.username();
        if uuid.is_empty() {
            return Err(anyhow!("missing UUID in vless URL"));
        }
        let host = url
            .host_str()
            .ok_or_else(|| anyhow!("missing host"))?
            .to_string();
        let port = url.port().ok_or_else(|| anyhow!("missing port"))?;

        let params: HashMap<String, String> =
            url.query_pairs().map(|(k, v)| (k.into_owned(), v.into_owned())).collect();
        let remark = url
            .fragment()
            .map(|f| percent_decode(f))
            .unwrap_or_else(|| host.clone());

        let network = params.get("type").cloned().unwrap_or_else(|| "tcp".into());
        let security = params
            .get("security")
            .cloned()
            .unwrap_or_else(|| "none".into());

        let alpn = params
            .get("alpn")
            .map(|s| {
                s.split(',')
                    .map(|p| p.trim().to_string())
                    .filter(|p| !p.is_empty())
                    .collect()
            })
            .unwrap_or_default();

        let allow_insecure = params
            .get("allowInsecure")
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false);

        Ok(Self {
            uuid: uuid.to_string(),
            host,
            port,
            remark,
            network,
            security,
            flow: params.get("flow").cloned().filter(|s| !s.is_empty()),
            sni: params.get("sni").cloned().filter(|s| !s.is_empty()),
            alpn,
            fingerprint: params.get("fp").cloned().filter(|s| !s.is_empty()),
            allow_insecure,
            public_key: params.get("pbk").cloned().filter(|s| !s.is_empty()),
            short_id: params.get("sid").cloned().filter(|s| !s.is_empty()),
            spider_x: params.get("spx").cloned().filter(|s| !s.is_empty()),
            path: params.get("path").cloned().filter(|s| !s.is_empty()),
            host_header: params.get("host").cloned().filter(|s| !s.is_empty()),
            service_name: params.get("serviceName").cloned().filter(|s| !s.is_empty()),
            grpc_mode: params.get("mode").cloned().filter(|s| !s.is_empty()),
            header_type: params.get("headerType").cloned().filter(|s| !s.is_empty()),
        })
    }
}

fn percent_decode(s: &str) -> String {
    // url::Url already decodes query pairs; fragments are not decoded by parse().
    percent_encoding::percent_decode_str(s)
        .decode_utf8_lossy()
        .into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_minimal_tcp() {
        let link = VlessLink::parse(
            "vless://aaaa-bbbb@example.com:443?type=tcp&security=none#test",
        )
        .unwrap();
        assert_eq!(link.uuid, "aaaa-bbbb");
        assert_eq!(link.host, "example.com");
        assert_eq!(link.port, 443);
        assert_eq!(link.network, "tcp");
        assert_eq!(link.security, "none");
        assert_eq!(link.remark, "test");
    }

    #[test]
    fn parses_reality_vision() {
        let link = VlessLink::parse(
            "vless://uuid@host.example.com:443?type=tcp&security=reality&pbk=PBK&sid=SID&fp=chrome&sni=www.cloudflare.com&flow=xtls-rprx-vision#node",
        )
        .unwrap();
        assert_eq!(link.security, "reality");
        assert_eq!(link.public_key.as_deref(), Some("PBK"));
        assert_eq!(link.short_id.as_deref(), Some("SID"));
        assert_eq!(link.fingerprint.as_deref(), Some("chrome"));
        assert_eq!(link.flow.as_deref(), Some("xtls-rprx-vision"));
        assert_eq!(link.sni.as_deref(), Some("www.cloudflare.com"));
    }
}
