import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const frontend = fileURLToPath(new URL("..", import.meta.url));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const args = process.argv.slice(2);
let watch = false, setup = false, demo = false, port = 3000;
for (let index = 0; index < args.length; index++) {
  if (args[index] === "--watch") watch = true;
  else if (args[index] === "--setup") setup = true;
  else if (args[index] === "--demo") demo = true;
  else if (args[index] === "--port") port = Number(args[++index]);
  else throw new Error("Use --setup, --watch, --demo or --port <local-port>.");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid local port.");

let stopped = false, child = null, pauseTimer = null, resume = null;
process.on("SIGINT", () => {
  stopped = true;
  if (child) child.kill("SIGINT");
  if (pauseTimer) clearTimeout(pauseTimer);
  if (resume) resume();
});

async function main() {
  // Match the Next development server's .env.development/.env.local precedence.
  require("@next/env").loadEnvConfig(frontend, true);
  let database;
  try { database = new URL(process.env.DATABASE_URL || ""); }
  catch { throw new Error("Configure a local DATABASE_URL before testing AB imports."); }
  if (!["postgres:", "postgresql:"].includes(database.protocol)
      || !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)) {
    throw new Error("Local AB testing requires PostgreSQL on localhost. No files or imports were changed.");
  }
  const directory = path.join(frontend, ".local-data", "ab-sync");
  const source = path.resolve(frontend, "..", demo ? "AB-test" : "ABs");
  let token = process.env.AB_SYNC_TOKEN;
  if (!token || token.length < 32) {
    token = randomBytes(32).toString("hex");
    const environmentPath = path.join(frontend, ".env.local");
    let environment = "";
    try { environment = await readFile(environmentPath, "utf8"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    environment = environment.replace(/^AB_SYNC_TOKEN=.*(?:\r?\n|$)/gm, "");
    await writeFile(environmentPath, environment.trimEnd() + `\nAB_SYNC_TOKEN="${token}"\n`, { mode: 0o600 });
    console.log("Configured a private local sync token in .env.local.");
  }
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await mkdir(source, { recursive: true });
  // A demo gets fresh scan history so an already imported PDF can demonstrate
  // a new folder arrival without deleting documents or resetting normal imports.
  const scope = demo ? `demo-${port}-${randomBytes(6).toString("hex")}` : String(port);
  const configPath = path.join(directory, `config-${scope}.json`);
  const endpoint = `http://localhost:${port}/api/internal/ab-sync`;
  await writeFile(configPath, JSON.stringify({ source, endpoint, token, sourceName: demo ? "Local AB demo" : "Local AB test",
    stateFile: path.join(directory, `state-${scope}.json`) }, null, 2) + "\n", { mode: 0o600 });
  console.log(`PDF folder: ${source}`);
  console.log(`Local dashboard: http://localhost:${port}/admin/ab-imports`);
  if (demo) console.log("Demo mode: put one existing AB PDF in AB-test. Watch the latest 'Local AB demo' run change from Imported: 0 to Imported: 1. Existing documents are not duplicated.");
  if (setup) {
    console.log("Setup complete. Start npm run dev, then run npm run ab:sync:local or npm run ab:watch:local.");
    return;
  }
  let ready = false;
  for (let attempt = 0; attempt < 6 && !stopped; attempt++) {
    try {
      // Invalid operation checks authentication without writing a sync-run record.
      const response = await fetch(endpoint, { method: "POST", redirect: "manual", headers: {
        "Content-Type": "application/json", Authorization: `Bearer ${token}`,
      }, body: '{"operation":"local-auth-check"}', signal: AbortSignal.timeout(20000) });
      if (response.status === 400) { ready = true; break; }
    } catch { /* The dev server may be reloading .env.local. */ }
    if (attempt < 5) await sleep(1000);
  }
  if (stopped) return;
  if (!ready) throw new Error(`The local app is not ready or has not loaded its sync token. Start/restart npm run dev on port ${port}, then retry.`);
  if (watch) console.log("Local testing: scans every 30 seconds. Ctrl+C stops the watcher. Newly copied files may need 30–60 seconds.");
  do {
    const status = await new Promise((resolve, reject) => {
      child = spawn("python", ["-B", path.join(frontend, "scripts", "sync-kitchen-abs.py"), "--config", configPath], {
        cwd: frontend, stdio: "inherit", windowsHide: true,
      });
      child.once("error", error => { child = null; reject(error); });
      child.once("close", code => { child = null; resolve(code ?? 1); });
    });
    if (!watch) { process.exitCode = stopped ? 0 : status; break; }
    if (status !== 0 && !stopped) console.error("Local import reported an error. Check the summary above and AB imports; the next scan retries failed PDFs.");
    if (!stopped) await new Promise(resolve => {
      resume = resolve;
      pauseTimer = setTimeout(() => { pauseTimer = null; resume = null; resolve(); }, 30000);
    });
  } while (watch && !stopped);
}

main().catch(error => {
  console.error(error.code === "ENOENT" ? "Python was not found. Install Python and PyMuPDF to run local AB imports." : error.message);
  process.exitCode = 1;
});
