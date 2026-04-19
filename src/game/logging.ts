/**
 * Logging module for Dungeons Crawl.
 *
 * Uses loglevel (https://github.com/pimterry/loglevel) for per-package loggers.
 * Log levels are configured server-side in config/logging.yaml and fetched at
 * startup via the /api/log-config endpoint.
 *
 * Log entries are written to the browser console. Entries at warn level or above
 * are also forwarded to the /api/log endpoint, which persists them to the
 * server-side log file.
 */
import log from 'loglevel';

interface LoggingConfig {
  default: string;
  packages: Record<string, string>;
}

let config: LoggingConfig | null = null;

/**
 * Fetch logging config from the server and apply it to all loggers.
 * Must be called once at application startup before any loggers are used.
 */
export async function initLogging(): Promise<void> {
  try {
    const response = await fetch('/api/log-config');
    if (!response.ok) {
      console.warn('[logging] Failed to fetch log config, using defaults');
      return;
    }
    config = await (response.json() as Promise<LoggingConfig>);

    log.setDefaultLevel(config.default as log.LogLevelDesc);

    for (const [name, level] of Object.entries(config.packages)) {
      log.getLogger(name).setLevel(level as log.LogLevelDesc);
    }
  } catch (err) {
    console.warn('[logging] Error initializing logging:', err);
  }
}

/**
 * Return a named logger. If initLogging() has been called and the package name
 * has a configured level it will already be applied. Loggers created before
 * initLogging() resolves will use loglevel's default (WARN).
 */
export function getLogger(name: string): log.Logger {
  const logger = log.getLogger(name);

  if (config?.packages[name] !== undefined) {
    logger.setLevel(config.packages[name] as log.LogLevelDesc);
  } else if (config !== null) {
    logger.setLevel(config.default as log.LogLevelDesc);
  }

  return logger;
}

interface RemoteLogEntry {
  level: string;
  logger: string;
  message: string;
  timestamp: string;
}

/**
 * Forward a log entry to the server so it is written to the server-side log file.
 * Fire-and-forget: errors do not propagate to the caller.
 */
export function sendToServer(entry: RemoteLogEntry): void {
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch((err: unknown) => {
    console.error('[logging] Failed to send log to server:', err);
  });
}
