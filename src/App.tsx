import { useEffect, useState } from "react";
import { api } from "./api";
import type { EnvCheck, Status } from "./types";
import { Art } from "./Art";

interface Node {
  id: string;
  name: string;
  url: string;
}

const NODES: Node[] = [
  {
    id: "sg",
    name: "新加坡",
    url: "vless://ca77beef-3d4a-4b6a-8006-c823bea7f4b6@178.128.58.109:443?type=tcp&encryption=none&security=reality&pbk=cT_ZofdCQYf_JV7EmnGbcIlkIqd5I6bhnDH-YFZrhTg&fp=chrome&sni=www.amazon.com&sid=a1ac3f3b1bdc4454&spx=%2F&pqv=lvU2Mrg_lDkf3F4EvdfgWj2p0mWuMPSQjeylOwqcTvbu0LtHM2aHD_02pi74CQLzT2ko6K4j4vWkYl_g5NG2qt-UPRznFCbRKK-7_SnOq05GD4NG2A8q3qPp5rUpjUkfYlegtS4REAWfnFE9VvSu68p7yClDFyeVwxhCEaGZhB2a7eh1TuT2F3aw69FvQrAwA_xYcOS-k2e6dMc_1KdWVQRuMgHsTortGMJwiifnZx0mItB5Y3vPlf3yORPAruyfmlLz5KaOGPAOJ8AkpP5ZY77A6VA8W2S6Rb8YauxqMTl65Kn62cQa-up-u1AZ9JkOJnWmLmYiQ3a0V3AgYk3ykbGjOXP6-vIZY9_UtBmwpzhvsAczPk9aIqJtPDW54po2H-jkjG0bScqnLZ49wSNrFWOxQsGLypiIhK4mt7319b4JyOeBUTANzbxuAMiDvhRC5Lt0tPtyT4RXQMXEcj3NuFslIb39FjdcUfgBqXBnwAbC_9aHQ3VsXvoIHLCqwmbBKvlEaRnxsTYDZ3lHs0wm2o1uVvdhVLmxmtOizcdf8PlC82Qm_duR1rU6eAG7PJlaSo55ToKlJSLAqR04GKgvvUjkn60K4Zw012iLespMReGpVAMDSfDL66qnk_uM8vAmEsRE0Z1u6AulZ2lbrK9bSXDOSl-O9z-0rI3FqaNfkMF5-LetssnRhdvIgYbuuDbZ9U5WhvDAW_aoWRTT4QqZ8ctBTCuHVQbG6tn3WoTcIm-mniuCfMsonvNAB4DYKK5qvi0bquemWiPhYp_OqTTLfwogL_V1NRuxPlQMrdcmeVCshRZsZF8IuwrTaw5B95jHLqwm5Gsv7Lv0DnS7_pv9fkZir1LcY1LbOywu7i3ABjk7av1YxvA8I-xsjd4ERczfRWj6M9EhYrtsvPYmovHArmLtjfD8d3kStZfbc_ruSji6b9tCjQyZaCSXvgYKNzVb3fwjTRXJmZ3Ik0kOcQa1GVGP6PEO-GpU5jOY4U5-RLf7i_qEh4xuRvujKZRqNiIrnPJcGhXMWE3ClinrndpKpa50wMCVOVt6qwzqWEL_qjY2C5q4BPFdbHUamuDc-2Vctq4yw7_6YtSWjr8cl0VGzJoM3BMX985xEGTJiMxPN9UFRf87O4ouXwXm0tWOZ8MsfT6XpzwuRnD4J5SxSUEuPt_qzCi1xuhaEAZ47uiT0xwQ64F2mK7S68-l5vVCqgwV-dq0nZvuG9JTdCk_sy3LG8sUXA59DxvqBSaZeMRDwJsfihNrcIPOgR7-DTKPOy9a2RFRMj2ol7_2OpKq1VaSd6wzDm6WopSmhF4r3--GoM8R3Cw11HtIxhmzPgOipIzZ7DjInSBegcvVxVh-YWT4Pj-8XKCPi8E2-Mv5fPedogfG1ae2HSiIyuUm0-XpabsvucvqlA9S7tKnnNWOWGwm9WjkmaApJ58ujPdFhL22dyGOs2P5KHwEYkFER9lTTk34c6s3WHfL91uGEerz5XrEcJcQEJkCRR0tfP1FKBBPn0mE_kimnObLJawt8vr68Xk_q7ezMUr0pSPJGbk3FL6yd75wu9sDbAk5RBhBmvImnmh8Zhs12xTPpidITwoY4F9WBCC6VkVu2hz4ulLvNrUGevTyYNwZXXmzmEchoP87EJqa0wcS9pOkIseU8gUlXV5vaZZU8QTk57QXYGBo0WbSC82End-yJTvPE_tSTe9fooJbpnU7i05S7y3E4z6J_dAYvyV2mXok70uAbweru4LKnfnrjXBMr1aAEEMlSUAR87Gysd1-kCxKG59LajiE_27_mdWfW27KB8pokp3ECoX6WFyfsaVgA5k24IZOgaX96eNfoKgaMKBDfJOgVdTBlUtdFFIn4jT6Y7YzZe2x1kr6pkPLpWLFe3BAOjR6nfrhptUkAG5u5-hM6z1V_KvWj9YzVPF53jCyZByrtc5s8k0MBR9JDk3ZMbRF_mCsa3PodvSdLx__BV54MGMura6VOWcSLjRhGyo3d4tmQpwyGjY0vbeqFdG_IPehg0v2ZdIbt96KDZye2PXI2brojLzUK5rvi3LMS79FXPhyb0Cl9tU_qlyBnGrE3x6LZ4ux-MCHZRy1I9FUT6Yl6RHjUo6zRmRBIsr4hOPykawrW-PHj1dZxpjrNQpX2XXOgZzT9dGnMVZZ1BNoaD6hfd0NGHCone73X2ckeZPgs4y_x5jDQFbg7qWIlUBaXgF0i85YdWyqlcZeDeGhKGEK6QTJ6g0V0yNGvqhbSUa046dnTl9g-5dm4R67_yPpidozq98cJ1uFzBTXVs7tZdk60jrkRLD6drrfL7QEyMYedGqbf8LSfftbjD2JYh6jNSci1MDdJ-_vGvkfbFEABu2zacLfD8_ULehqGXbB6JbL8vsbf5JJZerR5SujwprDXEV0Rr3NOYOLx3rrefRX2VQj4zmdhtA0dyWIlTgfzXUS0oRDaN7xSBVrk_9HlKDyh6tuUTOz72X_O_wGk4XGwIUWUh42gG8JNXf_lfREt0ga2MzVmpKcyrgFtiDVe3M1y5ak4NgXXJhcJGNHj4jmoIpZSBpZs4xA8MRSrEPgoYYxc4JHiYgGh1jRvrCSC8nRX0MqGJhdwzPUkK8#9yqkl6xo",
  },
  {
    id: "la",
    name: "洛杉矶",
    url: "vless://3d27c042-59fd-4e22-834e-e4bf7c3eaf9e@45.59.128.75:443?type=tcp&encryption=none&security=reality&pbk=82YCXUqR7KuIRxvr0Cmk5Q8c1MiSH5qPocbmdY8Bdjc&fp=chrome&sni=www.amazon.com&sid=6a2784e1&spx=%2F&pqv=TBYcMhUcoVniwGgE3bTXIg1xtzv5cEkDOo4nEnee2x6Y1ihQrgLkUP2owqlJHe_JJllR1_0uSdXAdtfOKsvwwCreE1hspvvH7eyUSnvq8FbqQAmjUXdsJlyfZpWYphtyY0D0ooufjiDezIeZwNvxxZPQzJ9C9cLqFs3yfgI5G2ay_VCWuDomdjovvXAlg1UaK6aq5QvWtsg4wTf4n7qJmojPKz-FKAzEu1BGzZR5yjIPT2lMkPS2whn6TQm8oFnSDsdGfBcXEj9aWPyinqHgtNBGD7TffnZNfCcDvgTeJLj-cWGWtxYCWPt1eucd7x3r1BY5zg68XX20Fz0rHSCYuN6vK4SUxoPwF7jOfx5nsbYaa901Gn2RBdGrFgPvWi4_d03JMlZR-gYtc3pblh17YGVJISjUQ7uoD5Ozpme_YWgM9FH4rkBE6E436LfFC5-FE3ChFlKTNRsq2I6PN3k56il1qoV7Lgzy1lWhZgMlvo-Kas0JwUEv4N8x-lQohXhkEzBZwduRxyfROOje_elOk28v-qf0c-Td8Vzfx-QOP9IFeH0DX1MmLnp9prUNsoqtkS8HtTgNVGvh1aKIeFwOSqtrlywLE_SMRiTnmkaFRu-jA24aqAnCB1Mtf9DkvXhFawvOmj_mFinGw_vzC8a5bN02vum2aca3RlC-yqZyBXIwXzfpvQBh5y26jNVLdTNi4EBUCguZL2HVOV6H7V6PWMCY3ExwscvKf5hab23S8cdr2mWE1wAn4f6Ckgk9s9PXyM_nZDLFj2BDVVIAWOPMgYsg3oqD0Q1ZJce4MW9TTh70-f0qoh_h-gqdnkJtAo9ajkc8KTtD6qiHUuRQH9Esuhk3SsLN6g0pFNMNvy0-NNp9N5lsgnlw6AonOMKvk_zBZquqcRln9DGqjohbYN_L3OcqAKtrYjpetoGnk6W2d4_CTN9jhPxCZjUW_3wRZiB_0jAHKSlx3phDydy_n1_4OhAwtPEhMZQEmLX8eFPzAgfiPWT0eUA-WzCG7evX7BC78SPJkxZQNy2pmSYFu9gGgQ-yp__obLkV_em50eJVLvIjBXNtxd5dOlpB3xW5-obMQrmfHo-5wEiDnZdLHNu1xhKlZ7iyI4TdHYuZvAqjs4zbRhGm-mri3hhZVebJ4xegkc0rkUFBgpOieAC6QnZ-CUHq3iAcGlCmx_NlN5XMVq59q2gZn4LOoQwpkEjeIPsPWd_6w1DveyI3X6WYs1PN6T7BV14E70o7VtD68HiOjvq0FbqqJP_MXCyfaOMO1xegJatKAPlbpNAiHhrfPnRYmFkhpjc5FcSPNg2g7ak0yxSA1eWR0ij7RoZrJuZra-3e7vSsmaXDTp_5sh6z0GqiH0LOLdWz_ASyl4_7Mi9k_wi48ILmPhzTMxxjR__ze4yV64-pFiNT8OJq-iNQ8CuiqhgkiQgw6pK1TMleUirNP033iZSHaxYha1LL7Vnx5uKOzfGrO-QIoxLU5JWdwep4AUtykwC5zB_hbillA674zFVff4rasQAKxo6S4BpyMJXMKbke-ORKafTfKmXyp_TA_5gq-Za_nFg59q6R6ZigER_g69oWccvj0eiQKDmUs46kAD9EoPO2OKC0n-4M1ci4WvBF-8uch-bNj3Q_QcABm41NJKvmi51Rd8QRyxzxuxAeloQDc6DKiHX96P-ZdS3jTy1m2vHqLTMBuhs39SAecLrLE6mKTybHuxr7yuYnwx5Fnley2aaI9EkMPSXo961sIH_PqEjTBKzEDaDG6UN741Eve8MSyStRYHR1QlFU8XkoRQD3jp5W-Hf-vuVaG_cRzw5Ryg4PId6sLexGrH6CvmRdm_h-KXlQHYRxjyBLx8OD0ml-cIUNRdowH56e2z3m1-z4AEeMqRnSgp7j085mp1Z4H5fduzIxpyO9_siqjVd2drEAnBYBO-kUQ9MLaBYHeJxHITKv1p2KH9cVtMyHKc6oIcZtcpL1G9aLmjKQ9fr1IzjRT2IpHVfi0ugN3ouBU8tGVJl5WxO-9k9aMZlrVaUst5aiWRZz11EpLym2ueEkUlr9EIP3tnCSqvPErpo3vBk7G-WvQNjA4vzOx1qdt8hVGYLcyd8eRS8QjenoHkghwAX04C-XEBmxLCiGagm0wjNPO0xNh39SwI5BkwXk3oi3tAoq38JNLVf7Z3FVwVkeVxUmrncWxpHJ99tFceoTPeSPyQgmfii1wNanc7ucTvg3XT9BTgB8ZjsBNXNEw2mUG35nRaoMwgY-cJmYttjYhySS_FO1uhqNLzasvpWj_DSiF5JAAboW5HZ0JP56EcbiIE7-r4EDkkTawx8ErVve9pLpnL7AtEF7QuCUtBZbgo4lsm90yuGU0IxLxVp2ulLdTiR3c9uhfKPyQivqu6GpN8Lwmtk72w08JBpA8YqlzCOrQQf12bae6IShayt-J2vxxv56aDXa5CTHT0Jod3BtoF_f8gGwFp9tgb88VPikrdoeYsK7Ev-qYxPqivVBnQhobDgmAJjqg-BWX4HjQXmJbUENwQjOcorrZzAogM_D_s6snonL3lr8kFzYTUaOohQgJbwVSFQCXBRJuAMbzXO-urFdpQCXGCnKkCkHNpF1U48#gfvw2zyt",
  },
];

const NODE_STORAGE_KEY = "drift.selectedNodeId";

function loadSelectedNodeId(): string {
  try {
    const id = localStorage.getItem(NODE_STORAGE_KEY);
    if (id && NODES.some((n) => n.id === id)) return id;
  } catch {
    // localStorage unavailable — fall through to default
  }
  return NODES[0].id;
}

const POLL_MS = 1000;
const PING_DELAYS_MS = [1000, 3000, 5000, 7000];
const PING_URL = "https://www.gstatic.com/generate_204";
// xray running locally doesn't prove the remote server is reachable, so we
// fall back to consecutive ping failures as the real connectivity signal.
const PING_FAIL_THRESHOLD = 3;

interface Copy {
  title: string;
  subtitle: string;
}

function latencyTier(ms: number): "fast" | "ok" | "slow" {
  if (ms < 200) return "fast";
  if (ms < 400) return "ok";
  return "slow";
}

function copyFor(s: Status, latency: number | null, pingFails: number): Copy {
  switch (s.kind) {
    case "Disconnected":
      return { title: "未连接", subtitle: "点击下方按钮，建立加密连接" };
    case "Connecting":
      return { title: "正在连接…", subtitle: "握手中，请稍候" };
    case "Connected":
      if (latency != null) return { title: "已连接", subtitle: `${latency} ms` };
      if (pingFails >= PING_FAIL_THRESHOLD)
        return { title: "节点不可达", subtitle: "服务器无响应，请检查节点状态" };
      return { title: "已连接", subtitle: "测速中…" };
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
  const [pingFails, setPingFails] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(loadSelectedNodeId);
  const selectedNode = NODES.find((n) => n.id === selectedNodeId) ?? NODES[0];

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
      setPingFails(0);
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
        setPingFails(0);
      } catch {
        if (!cancelled) {
          setLatency(null);
          setPingFails((n) => n + 1);
        }
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
      const result = await api.connect(selectedNode.url);
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

  const onSelectNode = async (id: string) => {
    if (id === selectedNodeId || busy) return;
    try {
      localStorage.setItem(NODE_STORAGE_KEY, id);
    } catch {
      // ignore — selection still applies for this session
    }
    setSelectedNodeId(id);
    const next = NODES.find((n) => n.id === id);
    if (!next || !isOn) return;
    // Connected: hand over to the new node. backend's connect() tears down
    // the existing session first, so we don't need to disconnect manually.
    setError(null);
    setBusy(true);
    try {
      const result = await api.connect(next.url);
      setStatus(result.status);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const unreachable =
    status.kind === "Connected" && latency == null && pingFails >= PING_FAIL_THRESHOLD;
  const { title, subtitle } = copyFor(status, latency, pingFails);

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

      <h1
        className={`title title-${
          unreachable ? "failed" : status.kind.toLowerCase()
        }`}
      >
        {title}
      </h1>
      <p
        className={
          status.kind === "Connected" && latency != null
            ? `subtitle subtitle-${latencyTier(latency)}`
            : unreachable
            ? "subtitle subtitle-slow"
            : "subtitle"
        }
      >
        {subtitle}
      </p>

      <div className="nodes" role="tablist" aria-label="选择节点">
        {NODES.map((n) => {
          const active = n.id === selectedNodeId;
          return (
            <button
              key={n.id}
              role="tab"
              aria-selected={active}
              className={`node-pill ${active ? "node-pill-active" : ""}`}
              onClick={() => onSelectNode(n.id)}
              disabled={busy}
            >
              {n.name}
            </button>
          );
        })}
      </div>

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
