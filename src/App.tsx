import { useEffect, useState } from "react";
import { api } from "./api";
import type { EnvCheck, Status } from "./types";
import { Art } from "./Art";

const DEFAULT_URL =
  "vless://e4121714-df5b-4f3f-be21-482e2a336a39@103.118.42.29:443?type=tcp&encryption=none&security=reality&pbk=n1JKjOblKtU6--JVGxhLeIl_swa8nEr3a_5_tPqJWDU&fp=chrome&sni=www.amazon.com&sid=553758a73048f1&spx=%2F&pqv=ADum55U2o4MEHX6HhJYyVwGDBWZhQLktLj5sC-47YlCyudUVX2kEHkiASfjb_M_k3SlfA2oC2Ck__lw0U6HR2MtTGN-CsEVGyyFKTU-bGfVQY0hwwPgEEjRhQgdmiuFR69TYjGTuyYxKMJSw0M3HrGSBnVyQShLJ0N6mXYWf88izcnyrVAfttgSVozz91yeYsBl_u_uNxLmjBHeIcSV9JOjU9H6z4llmUjZVwsVKadU5U-X_SuRTaythhz3GYbb1QMQy5ZvvDhDzl_7H-a7gsTMenl4TAfF0BXzi09TcXybw1_K-3OrK_W-2b6GINTSW9UlUPY9cpMWrqkt93RS_btmkN6nkh8WIV4U-NuEPEi9CoqqYnj3X-awDFE4ATAxED4nflJeVeGavH1WrAIed9r3UJ-IixpL9d4xDjRL6H6cDvaS6sv6UtmHwAAbutTH2ZXPK60T4_B7PngxM_Hb0BMvgv3bHm8j5Du9emISaEDwCyUhrn-VLNj74xglqHLamOiSGAevYBuQIXvn17_0-t6jJEW8mBB1hTGzdU58NAdw5jt1SnH-ndkCjnR-BBezyNK7nb7WeywmKsjHgAivcXAAVu67hmfRwNYoE4O7RCObUb1KnOTDRctVDCDOKGBP0m2kV3IhZYE-ettRG17Rt7XZs2bY57_UUDEeP6LBTnVRdQtxP0VtBT0R5UdKn2-QUCypPoKFmP2eN0QPNImTQlBtFbL17xgeP6KQSh6ttet_1dxYVJX87yynoF1NkRePJpDZMJoQLzC_FoXxrCQth72elj6lgZwlN7Ut7mTbMblv5bYJaUlLRlQJSgGTLbieIu1qy2ktFn4HHET_R7dkwqFr3o84BAZ22B2_t5xmxWIqLiUMq1JwMWlPhyUIfFM4wa6-4gKqqgSHsnTZAAWA1tSoNU_2jH4yz6MeqtHpCtx1pL-VSxxt5maUbLJCZZs35XNyen5mQgfnBquTd6SqUpmnACBX94-MEOXftgsKyQSlk0DOlrhLuYWgU1ZJsUTxK5z4l9q3DGaDm5BCgddiEjW0W0aOeBrY_uJGmRQeA2m0d702PUFZBQHu-1rxTnJCAkyfsLI-zmR7KWUNupOSG6zfQ60wZW1H8RDq92-7tqbXUQGtAsaI9BzdpoHmdxQBVZ95svchCBfhGKC6epe0Wgxlsr2Nb5JSDUgTs_3DaMcOc2kIz8JFI-_nn3X96zTT75qyKPTItU2ZA4jTv5WDD2_-Z3G3mreOQ5YB5h79SyYs7MhUdupKpKVqf4EJzocIA0aV5VMuZf0pevvNqr0k6JIqsVI2m85ErP8S7QbmbR5cyML-VO7wLTPjTw-vbqXloXX7Pvk_OCSQq1hz1T0phNPN6TLFXeHkdm-so6uqtYwJnvA2y_qd6MFfk9oqABCiH5fIebDrYHej2wfXO5eYa4laP9EDyKF7S0b3SOEql-Ab_Wlda8R9cDPGfjoNXo0BLkI__r_TMZpKsswe_rIEtwKyre9amuwN_ehoUCZPGj2i1jFFNzzxpQVOfU4_uucE_ocWoRnvC9Wx2DrpatZotinwdRxZiMLA1DccaAR1uqpz_2ncTAr07ZtQu6xc9UjyO6CsEwA_xvgy5SCauuRdMC7fzK2keoKHjkinWzF0yFr4FzAVz14_8cADZc7N2VbpPNmVY1bu9Ps7UBRCdkp0149hcb3UghS_UlP021b-ABoOXYXyoSOefOouEj8VRn8E2BxCzXTUkoOkO4-lnaEOy5BXdVG-qNK9yC7bFElN8jbof4gXQYBMGcjE3GZcAxsuzS38J2L7s6XTxDDOJjyWUzvm-YlAZAP2uuEWlKyfW2OUZAHEH_k-s-4NVvoxIpam3TTwzyuQLjsls5LC8Hd1ImzaZSl7wN8oTobDcrwct9r8DqlxJy87ZhIFJ5tOV9O-88f_YINe--hg73wCIpP_h9A_EXw3k8bz7wOEf6DDqfRhA9Rgm8ikJv0U_Sx9KMMG8TG6wp-2W_sxhHDF6oGmBGlypQNoSxZ3bpt6l07YR-KyTdGp8gyneJZcaBTtDHtNIb6bY0e1JV52lWfwtlZm7_xHdH9ktguUH_30RItyISE4HK6zSVbu_lCWrQXWPY2Abj6azRvks6-ogbv9D9PxmNYCCgKFbRi2YZjEugXZ4y1UHWYDF3FAtZrhtXzmgbAiYfopcpK5W2Xx4eewvfiZpuV858lHpOqIOTJLXJHvTBqmbZ-CmQ07tn_hUcHweoPnC0bHavP7WoI9UKHN6hssTUonQZkE6oXISoDwL07bqbWaiMeUw_A84WbrlYdPXlOgv-Hjh_BGVRqPDH8Sct8F92ALEuPWUGAZ5HHmhWw_JJ1P5bTKI39rKO27S-pS9qLoUibk4AhLNlCrxuNh6EE8gJxrl8nzLdoOOBi8RC-z6bxNh7aqEeUJwHmGaMa242sES4mE7ZTfzuzeKUu62ZPjPPW5psAbFBFOhyoJgfQI-bLSbUlPzRHkXnT00XDK_a4klaJ8BwczCau7QNSc3XK0XbeAKxNLyQ2TO7RiLrk_0zL8bAouXTpwtNzzy2XZhO7u0M-AvBB4EeipMA4eCJ8pUoeeNUd_9UwBJReDfU6p985o#gdaydx3g";

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
