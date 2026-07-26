import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(root, "..");
const standaloneApp = path.join(
  appRoot,
  ".next",
  "standalone",
  "apps",
  "candidate-app",
);
const serverJs = path.join(standaloneApp, "server.js");

if (!existsSync(serverJs)) {
  console.error(
    "Standalone server not found. Run `npm run build` in candidate-app first.",
  );
  process.exit(1);
}

const staticSrc = path.join(appRoot, ".next", "static");
const staticDest = path.join(standaloneApp, ".next", "static");
const publicSrc = path.join(appRoot, "public");
const publicDest = path.join(standaloneApp, "public");

if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDest, { recursive: true });
}
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
}

const port = process.env.PORT ?? "3001";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

const child = spawn(process.execPath, [serverJs], {
  cwd: standaloneApp,
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: hostname,
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
