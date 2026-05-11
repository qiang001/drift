import { useEffect, useState } from "react";
import { api } from "./api";
import type { EnvCheck, Status } from "./types";
import { Art } from "./Art";

const DEFAULT_URL =
  "vless://b6f3b9cb-b4ba-41bb-afb8-d9310fe23602@159.65.1.139:443?type=tcp&encryption=none&security=reality&pbk=Uv4FB7QX6MzOhHaWIJ3qzcBjZrDlu8qosR20WfVUByE&fp=chrome&sni=www.sony.com&sid=78e2192e0646ca&spx=%2F&pqv=whdnYAOnbhqTTAR9F3S-IRcow2X895mIPSZ2j63GH-E5PB1jF0dsDIWZkTlpQbzJm3RxNFV4h2EJOa7faj0Dmazpycx6h3b1E8SKZtZmpzse7qS19vqZZDv6pJ408HvOzJoRq0bjJ7Qas4oUNfPmAGpv4rV85x7dffYiF_VJt_9GoOqd_CZtG9tkrc8E1rQEaD1SKm6bkoAManwvvLIgDN55aRyZjL2lpVbQNSrpCpRk_C8EDUN--vXoEQeaAmQ6BCFPb_yMThabB0B-mqTgLcf_WFJrjuKuSUeC0uQ_HV8HrU58ts6Ty2Wp0e2IGfQ7VpVMTc1qhwn4gfn85YVsFdzR7xDrdffrUDWJyFgueLaBN9s2u1xU1EX4jD-fs-dlb7QqjMdZzcyEubg9EO6RxPHnFo_GDc9So5Dr1VtkfG-LzGRr_qYEz1ad3wR_f9xAHStk1vVRycPTNG-ZLTFVEq201DkOTm7kX8RV-GvigOtLex_dF6tqhKix-rNIJYM7GmJWsPvlrYZqKHLg_GuORBBhiYxLw5d8sgmtMoA9aQv9RCxv6Bs2APBqSPfrO5YecVNVGlpv7P8uxxvxpsMDp4bGETCqgOPAp22eXbcfE_Q0hD31IQy2RTtfZ3KlyNwshuOVoe5M8DQDkUV1phAmXoZs7BoMD68UzHoNZ1fkn7PYKWnNBz7FKZmf1bu--K-R548vp1QFTgF5Sw_HYpIVKhMWo2luZoPig93VCskvHLHil5dG0C53bsm2TRC1TrAX-xAWSk7FroJIYSa4Gd0OHEbGJjSVhEkI-EAempwRYpvXbIAQfi_yZsMzH9_DCYOzkc1CNUoi1_yBbPZTwXppJzmK-6O3Z4-iPExs3c6dOiYo5B83b7-En2BvzXjJl4hDZeFS2OouNwA5d3GlhB6Ox9-l0wNAQC0117oQvBrhBGFrqN_dNCri7fu8NkKwLjIp_HbJ4Q1zF1XBKlzON6tsDs4ZchlQqV4X4HjCSyk7RnJ7hcrYz7LC19r7Y7H5NrgVk7OpyIve3X9sI0FXZhvF7ZXaqC5_uxJK7RT2KqPd_hcpRXpcpj239yKAuTBaQWNA1WwY_Sqz0IQ5soB9L0NwDAVHrWispEtNkY1lXmkxKJxgENheNaXitndvgZkRZcMLwFkD050qmfT5DosJz7qYXMOfdap48AKwzkU4ECc7FblJakOTpsdQN_RtyIp6jb_znuQOkhpsZPL_4npJa1SKpb65_Vuvt_SSgRc8C84UmM2cfVNb3C7EBGxt4SitVJCov0NMwDgmH8bdZg9lelnvsBwLy-Wm_dkFqBmLoYBoDgaMCvVEszqW-fSTc9ZysTggaxJSVR1cb9HWk8hj7bqP00nulo4kJitq-lrCV9rSBUWfbIpRm_bxqiBGJlEOvWCvklzJnCPAT6_jMhgEKszplvosPhMmyWFRyq_zltJXTW3Cakk1FSDelGHYXUSSQvTM9Zfi2IqUsXnqtUGpJDTfQHy98CvWvl50tAzpFz7Uecco7Twh17NUtlZSlttjzSway89jU-quYJxaeELSvp8qokBM9RgaPvSjBi6wR2D75LLGUgOycEp9jWd_WAjfenPaJNOugycQ_XYkESa_NOw80sppSFEL_x8uVXIURUX0dp1myxjusjAdLl_zh0ieV8TSuSpyZps7ZIb2Qfnpa3SXF1P4MVn2XLcFW43ZleOpPV97tjBvDLiq8-6kXHjvwI9fzsG_8tQwhWEX6VTA3ru7ZL2HMoSmyYeN2ToxpxhT4cgPnVvSaRvJTsNu-2as5KiKDrWpnyFjIGETdT9RVJfRHajXfim4RYkRI3rfBhjTpjoN70A5GsFtVTM_E3nTn13NAYIIdrpuBzu3dkpZcDPNvwmn5m9TbcIfhCy9GINdoE_RgF0OCl8w4C8Jcml6C2uHucI2roNNrj7TjeDAl2AsMW8tCdSfztwfvfyN0qydeHAEMTLV2V4QHDmORNSM8NU-hGsRXhSOPKnWErAJIf12nqLoYUz-_6tiemJNR1pely3R1iMqDv5UGPd_wXQo1tXSkvEZkL32NdSWW4aKWTbQ8AddAJD4riMMO1YJziTX5pvpy2IkXqyAbUnOyl08NQ4m-saOHejpf90HJbHokQsJHLQ1qX6MPXm68rSO5ayauz5KCpjmRP8o5yCGCz8EJoZDY95zqs7oIUl8wFv31Q2syVSRAHtQSalFEuGnbhMaQW6OkNOIP7SsUW11WY47SVSIbW79XBslly6dv_H6SA-_fTNXdpSVIwTQdk0heu0zs6ljtAa3vJXKB2mx46LVKqBG6tbDSfBT6yuuZDNthMuyXQR9SbyBbtYcyoAybMb5Y4kBvC1RFO-SFS_6xawXlvtNvVnoTBLoJQb3dt8l0uOGWwBDRsHJLIPh-hX8F4HGj06oB8w8noetl0aExIWfXyyRLdCeMG5Go17IHtrr9wyEyU1NgH5w6eJOy2us7Wlxyq3rYelHNA5LoaIYl-ah81ZlCchLlcDv2oIjHwf8CKSyN49Ic8T3waNXWy0w8eRxynWrNOen3djz3A8cLcxgmkRiwlEPg7n5qj4y0dnJYixGgoDB1lT8b2u8andDBWLqBA8#2tn421r5";

const POLL_MS = 1000;
const PING_DELAYS_MS = [1000, 3000, 5000, 7000];
const PING_URL = "https://www.gstatic.com/generate_204";

interface Copy {
  title: string;
  subtitle: string;
}

function latencyTier(ms: number): "fast" | "ok" | "slow" {
  if (ms < 200) return "fast";
  if (ms < 400) return "ok";
  return "slow";
}

function copyFor(s: Status, latency: number | null): Copy {
  switch (s.kind) {
    case "Disconnected":
      return { title: "未连接", subtitle: "点击下方按钮，建立加密连接" };
    case "Connecting":
      return { title: "正在连接…", subtitle: "握手中，请稍候" };
    case "Connected":
      return {
        title: "已连接",
        subtitle: latency != null ? `${latency} ms` : "测速中…",
      };
    case "Failed":
      return { title: "连接失败", subtitle: s.detail };
  }
}

export default function App() {
  const [status, setStatus] = useState<Status>({ kind: "Disconnected" });
  const [env, setEnv] = useState<EnvCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    api.envCheck().then(setEnv).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const s = await api.getStatus();
        if (cancelled) return;
        setStatus(s);
      } catch {
        // backend may be tearing down
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // ping for latency once connected — schedule 1s, 3s, 5s, then steady 7s
  useEffect(() => {
    if (status.kind !== "Connected") {
      setLatency(null);
      return;
    }
    let cancelled = false;
    let timeoutId: number | null = null;
    let i = 0;

    const ping = async () => {
      const ctrl = new AbortController();
      const t = window.setTimeout(() => ctrl.abort(), 5000);
      const start = performance.now();
      try {
        await fetch(PING_URL, {
          method: "GET",
          mode: "no-cors",
          cache: "no-store",
          signal: ctrl.signal,
        });
        if (cancelled) return;
        setLatency(Math.round(performance.now() - start));
      } catch {
        if (!cancelled) setLatency(null);
      } finally {
        window.clearTimeout(t);
      }
    };

    const schedule = () => {
      const delay = PING_DELAYS_MS[Math.min(i, PING_DELAYS_MS.length - 1)];
      timeoutId = window.setTimeout(async () => {
        await ping();
        i++;
        if (!cancelled) schedule();
      }, delay);
    };
    schedule();

    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [status.kind]);

  const onConnect = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await api.connect(DEFAULT_URL);
      setStatus(result.status);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.disconnect();
      setStatus({ kind: "Disconnected" });
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const isOn = status.kind === "Connected" || status.kind === "Connecting";
  const { title, subtitle } = copyFor(status, latency);

  return (
    <main className="app">
      {env && !env.xray_present && (
        <div className="banner">
          内核未就绪：缺少 <code>xray</code>，请在项目根目录运行
          <code>npm run fetch-xray</code>
        </div>
      )}

      <div className="art">
        <Art state={isOn ? "on" : "off"} />
      </div>

      <h1 className={`title title-${status.kind.toLowerCase()}`}>{title}</h1>
      <p
        className={
          status.kind === "Connected" && latency != null
            ? `subtitle subtitle-${latencyTier(latency)}`
            : "subtitle"
        }
      >
        {subtitle}
      </p>

      <button
        className={`cta ${isOn ? "cta-off" : "cta-on"}`}
        onClick={isOn ? onDisconnect : onConnect}
        disabled={busy || (env != null && !env.xray_present)}
      >
        {isOn ? "断开连接" : "立即连接"}
      </button>

      {error && <div className="error">{error}</div>}
    </main>
  );
}
