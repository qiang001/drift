use crate::vless::VlessLink;
use serde_json::{json, Value};

pub const SOCKS_PORT: u16 = 10808;
pub const HTTP_PORT: u16 = 10809;

/// Build a complete Xray config (as JSON Value) from a parsed VLESS link.
/// Inbounds: SOCKS on 10808 + HTTP on 10809, both bound to 127.0.0.1.
pub fn build(link: &VlessLink) -> Value {
    let stream_settings = build_stream_settings(link);

    let mut user = json!({
        "id": link.uuid,
        "encryption": "none",
    });
    if let Some(flow) = &link.flow {
        user["flow"] = json!(flow);
    }

    json!({
        "log": { "loglevel": "warning" },
        "inbounds": [
            {
                "tag": "socks-in",
                "listen": "127.0.0.1",
                "port": SOCKS_PORT,
                "protocol": "socks",
                "settings": { "auth": "noauth", "udp": true, "ip": "127.0.0.1" },
                "sniffing": { "enabled": true, "destOverride": ["http", "tls"] }
            },
            {
                "tag": "http-in",
                "listen": "127.0.0.1",
                "port": HTTP_PORT,
                "protocol": "http",
                "sniffing": { "enabled": true, "destOverride": ["http", "tls"] }
            }
        ],
        "outbounds": [
            {
                "tag": "proxy",
                "protocol": "vless",
                "settings": {
                    "vnext": [{
                        "address": link.host,
                        "port": link.port,
                        "users": [user]
                    }]
                },
                "streamSettings": stream_settings
            },
            { "tag": "direct", "protocol": "freedom" },
            { "tag": "block", "protocol": "blackhole" }
        ],
        "routing": {
            // Resolve a domain only when the rule needs an IP match — keeps DNS
            // light but lets the geoip:cn rule still catch CN-hosted endpoints
            // whose domain didn't show up in geosite:cn.
            "domainStrategy": "IPIfNonMatch",
            "rules": [
                // Block bittorrent on the proxied side — cheap defense against
                // a single user saturating the node.
                { "type": "field", "protocol": ["bittorrent"], "outboundTag": "block" },
                // CN apps (DingTalk, WeChat, Alipay, etc.) blocklist non-CN IPs
                // for risk control. Route them direct so they see the user's
                // real CN IP and behave normally.
                { "type": "field", "domain": ["geosite:cn", "geosite:private"], "outboundTag": "direct" },
                { "type": "field", "ip": ["geoip:cn", "geoip:private"], "outboundTag": "direct" },
                // Everything else through the VLESS tunnel.
                { "type": "field", "outboundTag": "proxy", "network": "tcp,udp" }
            ]
        }
    })
}

fn build_stream_settings(link: &VlessLink) -> Value {
    let mut s = json!({
        "network": link.network,
        "security": link.security,
    });

    match link.security.as_str() {
        "tls" => {
            let mut tls = json!({
                "serverName": link.sni.as_deref().unwrap_or(&link.host),
                "allowInsecure": link.allow_insecure,
            });
            if let Some(fp) = &link.fingerprint {
                tls["fingerprint"] = json!(fp);
            }
            if !link.alpn.is_empty() {
                tls["alpn"] = json!(link.alpn);
            }
            s["tlsSettings"] = tls;
        }
        "reality" => {
            let mut reality = json!({
                "serverName": link.sni.as_deref().unwrap_or(&link.host),
            });
            if let Some(pbk) = &link.public_key {
                reality["publicKey"] = json!(pbk);
            }
            if let Some(sid) = &link.short_id {
                reality["shortId"] = json!(sid);
            }
            if let Some(spx) = &link.spider_x {
                reality["spiderX"] = json!(spx);
            }
            if let Some(fp) = &link.fingerprint {
                reality["fingerprint"] = json!(fp);
            }
            s["realitySettings"] = reality;
        }
        _ => {} // none
    }

    match link.network.as_str() {
        "ws" => {
            let mut ws = json!({
                "path": link.path.as_deref().unwrap_or("/"),
            });
            if let Some(host) = &link.host_header {
                ws["headers"] = json!({ "Host": host });
            }
            s["wsSettings"] = ws;
        }
        "grpc" => {
            let mut grpc = json!({
                "serviceName": link.service_name.as_deref().unwrap_or(""),
            });
            if let Some(mode) = &link.grpc_mode {
                grpc["multiMode"] = json!(mode == "multi");
            }
            s["grpcSettings"] = grpc;
        }
        "http" | "h2" => {
            let mut h2 = json!({});
            if let Some(host) = &link.host_header {
                h2["host"] = json!(host.split(',').map(|h| h.trim()).collect::<Vec<_>>());
            }
            if let Some(path) = &link.path {
                h2["path"] = json!(path);
            }
            s["httpSettings"] = h2;
        }
        "httpupgrade" => {
            let mut hu = json!({
                "path": link.path.as_deref().unwrap_or("/"),
            });
            if let Some(host) = &link.host_header {
                hu["host"] = json!(host);
            }
            s["httpupgradeSettings"] = hu;
        }
        "tcp" => {
            if link.header_type.as_deref() == Some("http") {
                s["tcpSettings"] = json!({
                    "header": { "type": "http" }
                });
            }
        }
        _ => {}
    }

    s
}
