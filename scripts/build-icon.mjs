// Renders the Drift logo SVG into icons/source.png (1024x1024),
// then invokes Tauri's icon CLI to fan it out to every platform format.
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "src-tauri", "icons");
const sourcePng = join(iconsDir, "source.png");

// Drift logo: black square with three white wave lines (centered)
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#1d1d1f"/>
  <g fill="none" stroke="#ffffff" stroke-width="58" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 188 384 Q 350 246 512 384 T 836 384"/>
    <path d="M 188 540 Q 350 402 512 540 T 836 540"/>
    <path d="M 188 696 Q 350 558 512 696 T 836 696"/>
  </g>
</svg>
`;

mkdirSync(iconsDir, { recursive: true });

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1024 },
  background: "#1d1d1f",
});
const pngData = resvg.render().asPng();
writeFileSync(sourcePng, pngData);
console.log(`✓ wrote ${sourcePng} (${pngData.length} bytes)`);

console.log("→ tauri icon ...");
const result = spawnSync(
  "npx",
  ["@tauri-apps/cli", "icon", sourcePng],
  { cwd: root, stdio: "inherit", shell: true },
);
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log("✓ icons regenerated");
