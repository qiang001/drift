import { useEffect, useRef } from "react";

type Props = { active: boolean };

// Night sky behind the whole window: nebula washes, a Milky Way band with a
// warm core and dust lanes, twinkling bright stars and the odd shooting star.
// Everything static is painted once into an offscreen "sky" canvas; a frame
// only rotates that image and redraws ~100 twinklers + meteors, capped at
// 30fps and paused while the window is hidden.

const TAU = Math.PI * 2;
const FRAME_MS = 1000 / 30;
// Sky rotation: one turn per 20 min idle, 5 min connected.
const SPIN_IDLE = TAU / (20 * 60);
const SPIN_ACTIVE = TAU / (5 * 60);
const BAND_ANGLE = -0.62;

const TINTS = ["255,255,255", "205,222,255", "255,238,214", "182,198,255", "255,214,236"];

type Twinkler = {
  x: number; // sky coords, relative to the rotation center
  y: number;
  r: number;
  alpha: number;
  phase: number;
  speed: number;
  tint: number;
  spikes: boolean;
};

type Meteor = { x: number; y: number; vx: number; vy: number; len: number; age: number; life: number };

// Seeded so the sky looks the same every launch.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Approximate standard normal: sum of four uniforms.
function gauss(r: () => number) {
  return (r() + r() + r() + r() - 2) / 0.5774;
}

function glowSprite(tint: string): HTMLCanvasElement {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, `rgba(${tint},1)`);
  grad.addColorStop(0.12, `rgba(${tint},0.75)`);
  grad.addColorStop(0.35, `rgba(${tint},0.16)`);
  grad.addColorStop(1, `rgba(${tint},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return c;
}

function blob(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: string,
  a: number,
) {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, `rgba(${rgb},${a})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

// Square of side `d` (the viewport diagonal) so rotating it never shows a corner.
function paintSky(d: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = Math.ceil(d * dpr);
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  const r = rng(7);
  const mid = d / 2;
  const ux = Math.cos(BAND_ANGLE);
  const uy = Math.sin(BAND_ANGLE);
  const along = (t: number, o: number): [number, number] => [
    mid + ux * t - uy * o,
    mid + uy * t + ux * o,
  ];
  const bandW = d * 0.085;
  const coreT = d * 0.2;

  g.globalCompositeOperation = "lighter";

  // Broad nebula washes across the whole sky.
  const washes: [string, number][] = [
    ["88,64,210", 0.22],
    ["40,96,220", 0.2],
    ["190,60,160", 0.12],
    ["40,170,200", 0.08],
  ];
  for (let i = 0; i < 9; i++) {
    const [rgb, a] = washes[i % washes.length];
    blob(g, r() * d, r() * d, d * (0.25 + r() * 0.3), rgb, a);
  }

  // Milky Way glow: many soft blobs strung along the band, warmer near the core.
  for (let i = 0; i < 260; i++) {
    const t = (r() - 0.5) * d * 1.05;
    const [x, y] = along(t, gauss(r) * bandW * 0.7);
    const nearCore = Math.exp(-(((t - coreT) / (d * 0.18)) ** 2));
    const rgb = nearCore > 0.5 ? "255,214,178" : r() < 0.5 ? "150,170,255" : "178,140,255";
    blob(g, x, y, bandW * (0.5 + r()), rgb, 0.03 + nearCore * 0.03);
  }
  // Galactic core.
  {
    const [x, y] = along(coreT, 0);
    blob(g, x, y, bandW * 2.4, "255,200,160", 0.16);
    blob(g, x, y, bandW * 0.9, "255,236,210", 0.14);
  }
  // Colored gas pockets hugging the band.
  for (let i = 0; i < 14; i++) {
    const [x, y] = along((r() - 0.5) * d, gauss(r) * bandW * 1.2);
    blob(g, x, y, bandW * (0.4 + r() * 0.8), r() < 0.5 ? "255,96,170" : "70,200,230", 0.05);
  }

  // Dark dust lanes slightly off the band's spine.
  g.globalCompositeOperation = "source-over";
  for (let i = 0; i < 160; i++) {
    const [x, y] = along((r() - 0.5) * d, gauss(r) * bandW * 0.22 + bandW * 0.12);
    blob(g, x, y, bandW * (0.12 + r() * 0.35), "4,5,16", 0.22);
  }

  // Star dust: dense along the band, sparse elsewhere.
  g.globalCompositeOperation = "lighter";
  const dot = (x: number, y: number, rad: number, a: number) => {
    g.fillStyle = `rgba(${TINTS[(r() * TINTS.length) | 0]},${a})`;
    if (rad < 0.6) {
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    } else {
      g.beginPath();
      g.arc(x, y, rad, 0, TAU);
      g.fill();
    }
  };
  const area = d * d;
  for (let i = 0; i < area / 170; i++) {
    const [x, y] = along((r() - 0.5) * d * 1.05, gauss(r) * bandW * 0.75);
    dot(x, y, 0.25 + r() * 0.5, 0.25 + r() * 0.55);
  }
  for (let i = 0; i < area / 900; i++) {
    dot(r() * d, r() * d, 0.3 + r() * 0.7, 0.2 + r() * 0.6);
  }
  return c;
}

export function Starfield({ active }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sprites = TINTS.map(glowSprite);
    const r = rng(42);

    let w = 0;
    let h = 0;
    let d = 0;
    let sky: HTMLCanvasElement | null = null;
    let base: CanvasGradient | null = null;
    let vignette: CanvasGradient | null = null;
    let stars: Twinkler[] = [];
    const meteors: Meteor[] = [];

    let angle = 0;
    let spin = activeRef.current ? SPIN_ACTIVE : SPIN_IDLE;
    let nextMeteor = 1.5;
    let clock = 0;
    let last = 0;
    let raf = 0;

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      d = Math.ceil(Math.hypot(w, h));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sky = paintSky(d, dpr);

      base = ctx.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, "#04050f");
      base.addColorStop(0.55, "#070a1f");
      base.addColorStop(1, "#0b0f2c");

      vignette = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.45, d * 0.62);
      vignette.addColorStop(0, "rgba(2,3,10,0)");
      vignette.addColorStop(1, "rgba(2,3,10,0.6)");

      stars = Array.from({ length: Math.round((w * h) / 2300) }, () => {
        const big = r() < 0.12;
        return {
          x: (r() - 0.5) * d,
          y: (r() - 0.5) * d,
          r: big ? 1.3 + r() * 0.9 : 0.6 + r() * 0.7,
          alpha: big ? 0.85 : 0.45 + r() * 0.4,
          phase: r() * TAU,
          speed: 0.6 + r() * 2.2,
          tint: (r() * TINTS.length) | 0,
          spikes: big && r() < 0.5,
        };
      });
    };

    const spawnMeteor = () => {
      const dir = Math.PI * 0.75 + (r() - 0.5) * 0.35; // heading down-left
      const speed = 520 + r() * 320;
      meteors.push({
        x: w * (0.2 + r() * 0.95),
        y: h * (-0.05 + r() * 0.4),
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        len: 80 + r() * 90,
        age: 0,
        life: 0.7 + r() * 0.5,
      });
    };

    const draw = (dt: number) => {
      clock += dt;
      const target = activeRef.current ? SPIN_ACTIVE : SPIN_IDLE;
      spin += (target - spin) * Math.min(1, dt * 1.2);
      angle += spin * dt;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = base!;
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.drawImage(sky!, -d / 2, -d / 2, d, d);
      ctx.restore();

      // Twinklers, rotated by hand so diffraction spikes stay screen-aligned.
      ctx.globalCompositeOperation = "lighter";
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      for (const s of stars) {
        const x = cx + s.x * cos - s.y * sin;
        const y = cy + s.x * sin + s.y * cos;
        if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;
        const a = s.alpha * (0.5 + 0.5 * Math.sin(s.phase + clock * s.speed));
        const size = s.r * 7;
        ctx.globalAlpha = a;
        ctx.drawImage(sprites[s.tint], x - size / 2, y - size / 2, size, size);
        if (s.spikes) {
          ctx.globalAlpha = a * 0.45;
          ctx.fillStyle = `rgb(${TINTS[s.tint]})`;
          const len = s.r * 7;
          ctx.fillRect(x - len, y - 0.35, len * 2, 0.7);
          ctx.fillRect(x - 0.35, y - len, 0.7, len * 2);
        }
      }

      // Shooting stars.
      nextMeteor -= dt;
      if (nextMeteor <= 0) {
        spawnMeteor();
        nextMeteor = activeRef.current ? 1.2 + r() * 2.8 : 2.5 + r() * 5;
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.age += dt;
        if (m.age >= m.life) {
          meteors.splice(i, 1);
          continue;
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const a = Math.sin((Math.PI * m.age) / m.life);
        const speed = Math.hypot(m.vx, m.vy);
        const tx = m.x - (m.vx / speed) * m.len;
        const ty = m.y - (m.vy / speed) * m.len;
        const trail = ctx.createLinearGradient(tx, ty, m.x, m.y);
        trail.addColorStop(0, "rgba(180,200,255,0)");
        trail.addColorStop(1, "rgba(235,242,255,0.9)");
        ctx.globalAlpha = a;
        ctx.strokeStyle = trail;
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
        ctx.drawImage(sprites[1], m.x - 6, m.y - 6, 12, 12);
      }
      ctx.globalAlpha = 1;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = vignette!;
      ctx.fillRect(0, 0, w, h);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      // Clamp so a long pause doesn't fast-forward the sky.
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      draw(dt);
    };

    const start = () => {
      if (reduceMotion || raf) return;
      last = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onResize = () => {
      layout();
      draw(0);
    };

    layout();
    draw(0);
    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
