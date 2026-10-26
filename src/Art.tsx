type Props = { state: "on" | "off" };

// Saturn-style ringed planet. Off: dim planet and ring. On: both light up, the
// glow breathes and a small moon orbits outside the ring.
//
// Everything ring-related lives in one tilted frame where the rings are
// axis-aligned ellipses centered on (100,100). Each ring is drawn in two
// halves around the planet — back (y < 100, hidden behind the planet) and
// front (y > 100, drawn over it) — which gives correct occlusion. Light comes
// from the upper left.

const TILT = -18;
const K = 0.3; // ry / rx: how open the rings look
const MOON_RX = 104;

type Half = "back" | "front";

function arc(rx: number, half: Half, dy = 0) {
  const ry = rx * K;
  const [from, to] = half === "back" ? [100 - rx, 100 + rx] : [100 + rx, 100 - rx];
  return `M${from},${100 + dy} A${rx},${ry} 0 0,1 ${to},${100 + dy}`;
}

function ellipse(rx: number) {
  const ry = rx * K;
  return `M${100 - rx},100 A${rx},${ry} 0 1,1 ${100 + rx},100 A${rx},${ry} 0 1,1 ${100 - rx},100`;
}

// Deterministic fine banding.
function grain(i: number) {
  const x = Math.sin(i * 91.7) * 43758.5453;
  return x - Math.floor(x);
}

// Radial opacity profile modeled on Saturn's rings: faint C ring, bright B
// ring, the dark Cassini Division, the A ring with the Encke Gap, and the
// thin F ring outside.
const STEP = 0.8;
const BANDS: { rx: number; a: number }[] = [];
for (let i = 0, rx = 52; rx <= 91.6; i++, rx += STEP) {
  const g = grain(i);
  let a = 0;
  if (rx < 60) a = 0.1 + g * 0.08;
  else if (rx < 73.5) a = 0.62 + 0.18 * Math.sin(((rx - 60) / 13.5) * Math.PI) + g * 0.14;
  else if (rx < 76.5) a = 0.04;
  else if (rx < 88) a = rx > 84.6 && rx < 85.8 ? 0.07 : 0.4 + g * 0.16;
  else if (rx > 90.6) a = 0.32;
  if (a > 0) BANDS.push({ rx, a });
}
const RING_IN = 52;
const RING_OUT = 92;

function RingHalf({ half }: { half: Half }) {
  return (
    <g transform={`rotate(${TILT} 100 100)`} clipPath={`url(#clip-${half})`}>
      <g className="ring">
        {BANDS.map((b) => (
          <path
            key={b.rx}
            d={arc(b.rx, half)}
            stroke="url(#ring-light)"
            strokeOpacity={b.a}
            strokeWidth={STEP * 1.2}
            fill="none"
          />
        ))}
        {/* the planet's shadow falling across the rings behind it */}
        {half === "back" && (
          <g clipPath="url(#clip-annulus)">
            <circle cx="108" cy="99" r="42" fill="#05060f" opacity="0.42" />
          </g>
        )}
      </g>
    </g>
  );
}

function MoonHalf({ half, on }: { half: Half; on: boolean }) {
  if (!on) return null;
  return (
    <g transform={`rotate(${TILT} 100 100)`} clipPath={`url(#clip-${half})`}>
      <circle className="moon" r="3.4" fill="url(#moon-grad)">
        <animateMotion dur="14s" repeatCount="indefinite" path={ellipse(MOON_RX)} />
      </circle>
    </g>
  );
}

export function Art({ state }: Props) {
  const on = state === "on";
  return (
    <svg
      viewBox="0 0 200 200"
      width="170"
      height="170"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      overflow="visible"
    >
      <style>{`
        .planet, .ring, .glow { transition: filter 1.2s ease, opacity 1.2s ease; }
        .scene-off .planet { filter: saturate(0.45) brightness(0.55); }
        .scene-off .ring   { opacity: 0.5; filter: saturate(0.5) brightness(0.7); }
        .scene-off .glow   { opacity: 0.3; }
        .scene-on  .glow   { animation: breathe 3.2s ease-in-out infinite; }

        @keyframes breathe {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }

        .body { transform-box: fill-box; transform-origin: center; }
        .scene-on .body { animation: float 4.8s ease-in-out infinite; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }

        .moon { animation: moon-in 1s ease both; }
        @keyframes moon-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <defs>
        <radialGradient id="glow-grad">
          <stop offset="0.35" stopColor="#7d7aff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#7d7aff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="planet-grad" cx="0.36" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#dfe6ff" />
          <stop offset="0.3" stopColor="#9a95ff" />
          <stop offset="0.68" stopColor="#3f32a3" />
          <stop offset="1" stopColor="#140f38" />
        </radialGradient>
        <radialGradient id="shade-grad" cx="0.3" cy="0.25" r="0.95">
          <stop offset="0.5" stopColor="#05060f" stopOpacity="0" />
          <stop offset="1" stopColor="#05060f" stopOpacity="0.8" />
        </radialGradient>
        <radialGradient id="rim-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.88" stopColor="#b9c6ff" stopOpacity="0" />
          <stop offset="1" stopColor="#b9c6ff" stopOpacity="0.5" />
        </radialGradient>
        {/* rings: cool silver-blue ice, lit from the left */}
        <linearGradient id="ring-light" gradientUnits="userSpaceOnUse" x1="8" y1="0" x2="192" y2="0">
          <stop offset="0" stopColor="#f4f6ff" />
          <stop offset="0.45" stopColor="#c3cbf2" />
          <stop offset="1" stopColor="#555b8c" />
        </linearGradient>
        <radialGradient id="moon-grad" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#f2f2f7" />
          <stop offset="0.6" stopColor="#a1a1aa" />
          <stop offset="1" stopColor="#3a3a44" />
        </radialGradient>
        <clipPath id="clip-planet">
          <circle cx="100" cy="100" r="42" />
        </clipPath>
        <clipPath id="clip-back">
          <rect x="-40" y="-40" width="280" height="140" />
        </clipPath>
        <clipPath id="clip-front">
          <rect x="-40" y="100" width="280" height="140" />
        </clipPath>
        <clipPath id="clip-annulus">
          <path d={`${ellipse(RING_OUT)} ${ellipse(RING_IN)}`} clipRule="evenodd" />
        </clipPath>
      </defs>

      <g className={`scene scene-${state}`}>
        <circle className="glow" cx="100" cy="100" r="90" fill="url(#glow-grad)" />

        <g className="body">
          <MoonHalf half="back" on={on} />
          <RingHalf half="back" />

          <g className="planet">
            <circle cx="100" cy="100" r="42" fill="url(#planet-grad)" />
            <g clipPath="url(#clip-planet)">
              <g transform={`rotate(${TILT} 100 100)`}>
                {/* faint cloud bands parallel to the rings */}
                <g fill="#ffffff">
                  <ellipse cx="100" cy="80" rx="60" ry="3" opacity="0.08" />
                  <ellipse cx="100" cy="92" rx="60" ry="5" opacity="0.06" />
                  <ellipse cx="100" cy="106" rx="60" ry="2.5" opacity="0.09" />
                </g>
                {/* the rings' shadow on the planet, cast just below them */}
                <path d={arc(70, "front", 9)} stroke="#05060f" strokeWidth="15" strokeOpacity="0.3" fill="none" />
              </g>
              <circle cx="100" cy="100" r="42" fill="url(#shade-grad)" />
            </g>
            <circle cx="100" cy="100" r="42" fill="url(#rim-grad)" />
          </g>

          <RingHalf half="front" />
          <MoonHalf half="front" on={on} />
        </g>
      </g>
    </svg>
  );
}
