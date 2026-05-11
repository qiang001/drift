import type { CSSProperties } from "react";

type Props = { state: "on" | "off" };

const CELL = 10;

// Apple-style monochrome palette
const C_NOSE = "#1d1d1f";
const C_BODY = "#ffffff";
const C_LOW  = "#a1a1a6";
const C_BAND = "#1d1d1f";
const C_FIN  = "#3a3a3c";
const C_WIN  = "#6e6e73";

type Cell = { x: number; y: number; fill: string };

// Rocket as a 4-wide stack of 10px cells, centered around x=100
const CELLS: Cell[] = [
  // ── nose (1, 2, 3 widening pyramid) ──
  { x: 95, y: 30, fill: C_NOSE },
  { x: 90, y: 40, fill: C_NOSE }, { x: 100, y: 40, fill: C_NOSE },
  { x: 85, y: 50, fill: C_NOSE }, { x: 95, y: 50, fill: C_NOSE }, { x: 105, y: 50, fill: C_NOSE },

  // ── upper body (cream) ──
  { x: 80, y: 60, fill: C_BODY }, { x: 90, y: 60, fill: C_BODY }, { x: 100, y: 60, fill: C_BODY }, { x: 110, y: 60, fill: C_BODY },
  // window row
  { x: 80, y: 70, fill: C_BODY }, { x: 90, y: 70, fill: C_WIN  }, { x: 100, y: 70, fill: C_WIN  }, { x: 110, y: 70, fill: C_BODY },
  { x: 80, y: 80, fill: C_BODY }, { x: 90, y: 80, fill: C_BODY }, { x: 100, y: 80, fill: C_BODY }, { x: 110, y: 80, fill: C_BODY },

  // ── decorative band ──
  { x: 80, y: 90, fill: C_BAND }, { x: 90, y: 90, fill: C_BAND }, { x: 100, y: 90, fill: C_BAND }, { x: 110, y: 90, fill: C_BAND },

  // ── lower body (clay) ──
  { x: 80, y: 100, fill: C_LOW }, { x: 90, y: 100, fill: C_LOW }, { x: 100, y: 100, fill: C_LOW }, { x: 110, y: 100, fill: C_LOW },
  { x: 80, y: 110, fill: C_LOW }, { x: 90, y: 110, fill: C_LOW }, { x: 100, y: 110, fill: C_LOW }, { x: 110, y: 110, fill: C_LOW },
  { x: 80, y: 120, fill: C_LOW }, { x: 90, y: 120, fill: C_LOW }, { x: 100, y: 120, fill: C_LOW }, { x: 110, y: 120, fill: C_LOW },

  // ── fins (L-shaped, flaring at bottom) ──
  { x: 70, y: 110, fill: C_FIN }, { x: 70, y: 120, fill: C_FIN }, { x: 60, y: 120, fill: C_FIN },
  { x: 120, y: 110, fill: C_FIN }, { x: 120, y: 120, fill: C_FIN }, { x: 130, y: 120, fill: C_FIN },

  // ── booster nubs ──
  { x: 90, y: 130, fill: C_BAND }, { x: 100, y: 130, fill: C_BAND },
];

// stable pseudo-random so scatter looks organic but doesn't shift between renders
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const BLOCKS = CELLS.map((c, i) => {
  const tx = 12 + rand(i + 1) * 174;          // 12..186
  const ty = 142 + (rand(i + 137) - 0.5) * 16; // 134..150
  const rot = (rand(i + 271) - 0.5) * 120;     // -60..60
  return {
    ...c,
    sx: Math.round(tx - c.x),
    sy: Math.round(ty - c.y),
    sr: Math.round(rot),
  };
});

export function Art({ state }: Props) {
  return (
    <svg
      viewBox="0 0 200 200"
      width="170"
      height="170"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <style>{`
        .block {
          transition: transform 1.2s cubic-bezier(0.34, 1.4, 0.64, 1);
          transform-origin: center;
          transform-box: fill-box;
          will-change: transform;
        }
        .scene-off .block {
          transform: translate(var(--sx, 0px), var(--sy, 0px)) rotate(var(--sr, 0deg));
        }
        .scene-on .block {
          transform: translate(0, 0) rotate(0deg);
        }

        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        .bob { transform-origin: center; transform-box: fill-box; }
        .scene-on .bob { animation: bob 2.4s ease-in-out 1.2s infinite; }

        @keyframes flame-a {
          0%, 100% { transform: scaleY(1); opacity: 1; }
          50%      { transform: scaleY(1.18); opacity: 0.85; }
        }
        @keyframes flame-b {
          0%, 100% { transform: scaleY(1); opacity: 0.85; }
          50%      { transform: scaleY(0.85); opacity: 1; }
        }
        .flame-a, .flame-b { transform-origin: top center; transform-box: fill-box; }
        .scene-on .flame-a { animation: flame-a 0.32s ease-in-out 1.2s infinite; }
        .scene-on .flame-b { animation: flame-b 0.42s ease-in-out 1.2s infinite; }

        @keyframes star {
          0%   { transform: translateY(-30px); opacity: 0; }
          15%  { opacity: 0.65; }
          85%  { opacity: 0.65; }
          100% { transform: translateY(190px); opacity: 0; }
        }
        .scene-on .star { animation: star 2.4s linear 1.3s infinite; }

        @keyframes puff {
          0%   { transform: translate(0,0) scale(0.6); opacity: 0; }
          25%  { opacity: 0.55; }
          100% { transform: translate(var(--dx, 0px), 60px) scale(1.6); opacity: 0; }
        }
        .puff { transform-origin: center; transform-box: fill-box; }
        .scene-on .puff { animation: puff 1.6s ease-out 1.3s infinite; }

        .fx { opacity: 0; transition: opacity 0.5s ease 1s; }
        .scene-on .fx { opacity: 1; }
        .scene-off .fx { transition: opacity 0.3s ease; }

        .ground { opacity: 0; transition: opacity 0.5s ease; }
        .scene-off .ground { opacity: 1; transition: opacity 0.5s ease 0.6s; }
      `}</style>

      <g className={`scene scene-${state}`}>
        {/* ground line */}
        <line
          className="ground"
          x1="10"
          y1="158"
          x2="190"
          y2="158"
          stroke="#d2d2d7"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="2 5"
        />

        {/* parallax stars */}
        <g className="fx" fill="#1d1d1f">
          <circle className="star" cx="28"  cy="0" r="1.8" opacity="0.55" />
          <circle className="star" cx="172" cy="0" r="1.5" opacity="0.5"  style={{ animationDelay: "0.4s" }} />
          <circle className="star" cx="55"  cy="0" r="1.2" opacity="0.45" style={{ animationDelay: "1.2s" }} />
          <circle className="star" cx="150" cy="0" r="2"   opacity="0.55" style={{ animationDelay: "0.7s" }} />
          <circle className="star" cx="185" cy="0" r="1.4" opacity="0.45" style={{ animationDelay: "1.7s" }} />
          <circle className="star" cx="18"  cy="0" r="1.6" opacity="0.5"  style={{ animationDelay: "0.2s" }} />
          <circle className="star" cx="92"  cy="0" r="1.2" opacity="0.4"  style={{ animationDelay: "1.9s" }} />
        </g>

        {/* exhaust smoke puffs */}
        <g className="fx" fill="#d2d2d7">
          <circle className="puff" cx="92"  cy="148" r="4"   style={{ "--dx": "-12px" } as CSSProperties} />
          <circle className="puff" cx="108" cy="148" r="4"   style={{ "--dx": "12px",  animationDelay: "0.5s" } as CSSProperties} />
          <circle className="puff" cx="100" cy="152" r="3.5" style={{ "--dx": "0px",   animationDelay: "1s" } as CSSProperties} />
        </g>

        {/* rocket — bobs as a whole when assembled */}
        <g className="bob">
          {/* flame trail */}
          <g className="fx">
            <path className="flame-a" d="M82 140 L100 175 L118 140 Z" fill="#d2d2d7" />
            <path className="flame-b" d="M89 140 L100 162 L111 140 Z" fill="#86868b" />
          </g>

          {/* 46 lego cells */}
          {BLOCKS.map((b, i) => (
            <rect
              key={i}
              className="block"
              x={b.x}
              y={b.y}
              width={CELL}
              height={CELL}
              fill={b.fill}
              stroke="#1d1d1f"
              strokeWidth="0.5"
              strokeOpacity="0.85"
              style={
                {
                  "--sx": `${b.sx}px`,
                  "--sy": `${b.sy}px`,
                  "--sr": `${b.sr}deg`,
                } as CSSProperties
              }
            />
          ))}
        </g>
      </g>
    </svg>
  );
}
