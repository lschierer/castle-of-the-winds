/**
 * GET /api/log-config
 *
 * Reads config/logging.yaml and returns the logging configuration as JSON so
 * the browser-side logging module can apply the correct per-package levels.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

interface LoggingConfig {
  default: string;
  packages: Record<string, string>;
}

const DEFAULT_CONFIG: LoggingConfig = { default: 'warn', packages: {} };

// Resolve the config path relative to the project root (two levels up from src/api/)
const PROJECT_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..', '..', '..');

export async function handler(_request: Request): Promise<Response> {
  try {
    const configPath = join(PROJECT_ROOT, 'config', 'logging.yaml');
    const raw = await readFile(configPath, 'utf-8');
    const parsed = parseYaml(raw) as LoggingConfig;

    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[log-config] Failed to load logging config:', err);
    return new Response(JSON.stringify(DEFAULT_CONFIG), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
