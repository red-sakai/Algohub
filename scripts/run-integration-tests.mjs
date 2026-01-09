import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const BASE_URL = process.env.INTEGRATION_BASE_URL ?? 'http://127.0.0.1:3000';
const TIMEOUT_MS = Number.parseInt(process.env.INTEGRATION_WAIT_MS ?? '', 10) || 60_000;

async function waitForHttp200(url, timeoutMs) {
  const startedAt = Date.now();
  const target = new URL(url);

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(target, { method: 'HEAD' });
      if (response.status >= 200 && response.status < 300) {
        return;
      }
    } catch {
      // ignore until timeout
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url} to respond within ${timeoutMs}ms`);
}

async function killProcessTree(pid) {
  if (!pid) return;

  if (process.platform === 'win32') {
    await new Promise((resolve, reject) => {
      const child = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'inherit' });
      child.on('exit', (code) => {
        if (code === 0) return resolve();
        // Common when the process already exited.
        if (code === 128) return resolve();
        return reject(new Error(`taskkill exited with ${code}`));
      });
      child.on('error', reject);
    });
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // ignore
    }
  }
}

let devProcess;
let startedServer = false;

try {
  // If a server is already running, reuse it.
  try {
    await waitForHttp200(BASE_URL, 1_500);
  } catch {
    // Start Next dev server bound to IPv4 so Newman can reach it reliably.
    devProcess = spawn('npx next dev -H 127.0.0.1 -p 3000', {
      stdio: 'inherit',
      shell: true,
    });
    startedServer = true;
    await waitForHttp200(BASE_URL, TIMEOUT_MS);
  }

  const testExitCode = await new Promise((resolve, reject) => {
    const child = spawn('npm run test:integration:only', { stdio: 'inherit', shell: true });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', reject);
  });

  if (startedServer) {
    try {
      await killProcessTree(devProcess.pid);
    } catch {
      // Ignore teardown failures on Windows (process may have already exited).
    }
  }
  process.exit(testExitCode);
} catch (error) {
  try {
    if (startedServer) {
      await killProcessTree(devProcess?.pid);
    }
  } catch {
    // ignore
  }

  console.error(error);
  process.exit(1);
}
