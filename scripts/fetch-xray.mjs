// Downloads the Xray-core binary for the host platform from the latest XTLS/Xray-core
// GitHub release and extracts it into src-tauri/binaries/xray/. Idempotent.
//
// Run automatically via `npm install` (postinstall) or manually via `npm run fetch-xray`.

import { mkdir, writeFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TARGET_DIR = path.join(ROOT, "src-tauri", "binaries", "xray");

const ASSETS = {
  "win32-x64": "Xray-windows-64.zip",
  "win32-arm64": "Xray-windows-arm64-v8a.zip",
  "darwin-x64": "Xray-macos-64.zip",
  "darwin-arm64": "Xray-macos-arm64-v8a.zip",
  "linux-x64": "Xray-linux-64.zip",
  "linux-arm64": "Xray-linux-arm64-v8a.zip",
};

function assetName() {
  const key = `${process.platform}-${process.arch}`;
  const name = ASSETS[key];
  if (!name) throw new Error(`Unsupported platform: ${key}`);
  return name;
}

function binName() {
  return process.platform === "win32" ? "xray.exe" : "xray";
}

async function fileExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchLatestRelease(name) {
  const r = await fetch(
    "https://api.github.com/repos/XTLS/Xray-core/releases/latest",
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "vpn-client-postinstall",
      },
    },
  );
  if (!r.ok) {
    throw new Error(`GitHub API returned ${r.status} ${r.statusText}`);
  }
  const data = await r.json();
  const asset = data.assets.find((a) => a.name === name);
  if (!asset) {
    throw new Error(
      `Release ${data.tag_name} has no asset named "${name}". Available: ${data.assets.map((a) => a.name).join(", ")}`,
    );
  }
  return { url: asset.browser_download_url, version: data.tag_name };
}

async function download(url, dest) {
  const r = await fetch(url, {
    headers: { "User-Agent": "vpn-client-postinstall" },
    redirect: "follow",
  });
  if (!r.ok) throw new Error(`Download failed: ${r.status} ${r.statusText}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(dest, buf);
}

async function extractZip(zipPath, outDir) {
  if (process.platform === "win32") {
    await exec("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${outDir}" -Force`,
    ]);
  } else {
    await exec("unzip", ["-o", zipPath, "-d", outDir]);
    // ensure executable bit on the binary
    await exec("chmod", ["+x", path.join(outDir, "xray")]).catch(() => {});
  }
}

async function main() {
  const binPath = path.join(TARGET_DIR, binName());
  if (await fileExists(binPath)) {
    console.log(`[fetch-xray] ${binPath} already exists, skipping`);
    return;
  }
  await mkdir(TARGET_DIR, { recursive: true });

  const name = assetName();
  console.log(`[fetch-xray] resolving latest release asset: ${name}`);
  const { url, version } = await fetchLatestRelease(name);
  console.log(`[fetch-xray] downloading ${version} from ${url}`);

  const tmpZip = path.join(os.tmpdir(), `xray-${Date.now()}-${name}`);
  await download(url, tmpZip);
  console.log(`[fetch-xray] extracting into ${TARGET_DIR}`);
  await extractZip(tmpZip, TARGET_DIR);
  await rm(tmpZip).catch(() => {});

  if (!(await fileExists(binPath))) {
    throw new Error(
      `extraction succeeded but ${binPath} is missing — check the release archive layout`,
    );
  }
  console.log(`[fetch-xray] done: ${binPath}`);
}

main().catch((e) => {
  console.error("");
  console.error(`[fetch-xray] FAILED: ${e.message}`);
  console.error(
    `[fetch-xray] the app will not be able to connect until you retry with: npm run fetch-xray`,
  );
  console.error("");
  // Exit 0 so npm install doesn't fail; the app will surface the missing binary at runtime.
  process.exit(0);
});
