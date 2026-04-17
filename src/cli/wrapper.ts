import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, delimiter } from 'node:path';
import type { Server } from 'node:http';
import { loadConfig } from '../config/loader.js';
import { createProxyServer } from '../proxy/server.js';
import { listenWithFallback } from './listen-with-fallback.js';

const WIN_EXTS = ['.cmd', '.bat', '.ps1', '.exe', ''];

function resolveWindowsShim(cmd: string): string | null {
  if (/[\\/]/.test(cmd) && existsSync(cmd)) return cmd;
  const pathEnv = process.env['PATH'] ?? process.env['Path'] ?? '';
  for (const dir of pathEnv.split(delimiter)) {
    if (!dir) continue;
    for (const ext of WIN_EXTS) {
      const candidate = join(dir, cmd + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export async function runWrapped(toolArgs: string[], projectDir: string): Promise<void> {
  if (toolArgs.length === 0) {
    console.error('Usage: ainonymous -- <tool> [args...]');
    process.exit(1);
  }

  const config = loadConfig(projectDir);
  const server = createProxyServer({ config });

  const cleanup = (s: Server) => s.close();

  let port: number;
  try {
    port = await listenWithFallback(server, config.behavior.port, '127.0.0.1');
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    console.error(`Server error: ${e.message}`);
    process.exit(1);
  }

  const baseUrl = `http://127.0.0.1:${port}`;
  const [cmd, ...args] = toolArgs;

  // On Windows spawn used to rely on shell:true so `claude` resolved to
  // `claude.cmd`. that also interprets shell metacharacters in any arg and
  // turns a trailing `"test & del C:\\file"` into two commands. Resolve
  // shims explicitly through PATH instead and keep shell off.
  let resolved = cmd;
  if (process.platform === 'win32') {
    const shim = resolveWindowsShim(cmd);
    if (!shim) {
      console.error(`Failed to locate "${cmd}" on PATH`);
      cleanup(server);
      process.exit(1);
    }
    resolved = shim;
  }

  const child = spawn(resolved, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ANTHROPIC_BASE_URL: baseUrl,
      OPENAI_BASE_URL: baseUrl,
    },
    shell: false,
  });

  child.on('close', (code) => {
    cleanup(server);
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    console.error(`Failed to start ${cmd}: ${err.message}`);
    cleanup(server);
    process.exit(1);
  });

  process.on('SIGINT', () => cleanup(server));
  process.on('SIGTERM', () => cleanup(server));
}
