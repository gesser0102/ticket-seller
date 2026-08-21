import { spawn } from "node:child_process";
import process from "node:process";

const port = process.env.E2E_PORT ?? "4173";
const baseURL = `http://127.0.0.1:${port}`;
const passthroughArgs = process.argv.slice(2).filter((arg) => arg !== "--");

function startProcess(command, args, options = {}) {
  const { env, ...spawnOptions } = options;
  const childEnv = { ...process.env, ...env };
  delete childEnv.NO_COLOR;

  return spawn(command, args, {
    cwd: process.cwd(),
    env: childEnv,
    stdio: "inherit",
    windowsHide: true,
    ...spawnOptions,
  });
}

async function waitForServer(child) {
  const deadline = Date.now() + 120_000;
  let earlyExit;
  child.once("exit", (code) => {
    earlyExit = code ?? 0;
  });

  while (Date.now() < deadline) {
    if (earlyExit !== undefined) {
      throw new Error(`Vite exited before ${baseURL} became available. Exit code: ${earlyExit}`);
    }

    try {
      const response = await fetch(baseURL, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // Keep polling until Vite is ready or the deadline expires.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${baseURL}.`);
}

async function waitForExit(child, timeoutMs = 5_000) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function stopProcess(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;

  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    await Promise.race([
      new Promise((resolve) => killer.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
  } else {
    child.kill("SIGTERM");
  }

  await waitForExit(child);
}

const vite = startProcess(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", port, "--strictPort"],
);

let exitCode = 1;
try {
  await waitForServer(vite);
  const playwright = startProcess(process.execPath, [
    "node_modules/@playwright/test/cli.js",
    "test",
    ...passthroughArgs,
  ]);
  exitCode = await new Promise((resolve) => playwright.once("exit", (code) => resolve(code ?? 1)));
} finally {
  await stopProcess(vite);
}

process.exit(exitCode);
