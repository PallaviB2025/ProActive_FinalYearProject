import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";
const nodeCmd = process.execPath;

console.log("⚡ [1/2] Starting ProActive API Server on port 4000...");
const api = spawn(nodeCmd, ["apps/api/dist/apps/api/src/server.js"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

console.log("⚡ [2/2] Starting ProActive Web App on port 3000...");
const web = spawn(npmCmd, ["run", "dev", "-w", "@proactive/web"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: isWin,
});

function cleanup() {
  console.log("\n🛑 Stopping servers...");
  try { api.kill(); } catch {}
  try { web.kill(); } catch {}
  process.exit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

api.on("error", (err) => console.error("API error:", err));
web.on("error", (err) => console.error("Web error:", err));
