/**
 * POST /api/log
 *
 * Accepts a browser log entry and writes it to the server-side log file
 * (LOG_DIR env var, defaulting to ./logs/) as well as to stdout so the
 * entry appears in process logs / systemd journal on the EC2 instance.
 *
 * Request body JSON shape:
 *   { level: string, logger: string, message: string, timestamp: string }
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const LOG_DIR = process.env['LOG_DIR'] ?? './logs';
const LOG_FILE = join(LOG_DIR, 'app.log');

// Ensure log directory exists (best-effort; errors are logged but do not fail requests)
await mkdir(LOG_DIR, { recursive: true }).catch((err: unknown) => {
  console.error('[log] Could not create log directory:', LOG_DIR, err);
});

interface LogEntry {
  level: string;
  logger: string;
  message: string;
  timestamp: string;
}

function isLogEntry(value: unknown): value is LogEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['level'] === 'string' &&
    typeof v['logger'] === 'string' &&
    typeof v['message'] === 'string' &&
    typeof v['timestamp'] === 'string'
  );
}

export async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }

  let entry: unknown;
  try {
    entry = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isLogEntry(entry)) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const line = `[${entry.timestamp}] [${entry.level.toUpperCase().padEnd(5)}] [${entry.logger}] ${entry.message}\n`;

  // Write to stdout (appears in systemd/container logs on EC2)
  process.stdout.write(line);

  // Write to the log file (async, do not await to keep response fast)
  appendFile(LOG_FILE, line).catch((err: unknown) => {
    console.error('[log] Failed to append to log file:', err);
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
