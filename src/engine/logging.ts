/**
 * Logging module for Dungeons Crawl.
 *
 * Uses loglevel for per-package loggers. In Tauri mode, log entries are
 * forwarded to the Rust backend for filesystem persistence. In browser
 * mode, they go to the console only.
 *
 * Usage:
 *   import { getLogger } from '../engine/logging.ts';
 *   const log = getLogger('game:combat');
 *   log.debug('Monster to-hit threshold:', threshold);
 */
import log from 'loglevel';

interface LoggingConfig {
  default: string;
  packages: Record<string, string>;
}

let config: LoggingConfig | null = null;
let tauriAvailable = false;

/**
 * Initialize logging. Attempts to load config from Tauri backend;
 * falls back to a debug-level default for browser-only mode.
 */
export async function initLogging(): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    config = await invoke<LoggingConfig>('get_log_config');
    tauriAvailable = true;
    log.setDefaultLevel(config.default as log.LogLevelDesc);
    for (const [name, level] of Object.entries(config.packages)) {
      log.getLogger(name).setLevel(level as log.LogLevelDesc);
    }
  } catch {
    // Browser mode or Tauri not available — default to debug for playtesting
    log.setDefaultLevel('debug');
    config = { default: 'debug', packages: {} };
  }
}

/**
 * Return a named logger. Call initLogging() once at startup before using.
 */
export function getLogger(name: string): log.Logger {
  const logger = log.getLogger(name);
  if (config?.packages[name] !== undefined) {
    logger.setLevel(config.packages[name] as log.LogLevelDesc);
  } else if (config !== null) {
    logger.setLevel(config.default as log.LogLevelDesc);
  }

  // In Tauri mode, also forward to the backend for file logging
  if (tauriAvailable) {
    const originalFactory = logger.methodFactory;
    logger.methodFactory = function (methodName, logLevel, loggerName) {
      const rawMethod = originalFactory(methodName, logLevel, loggerName);
      return function (...args: unknown[]) {
        rawMethod(...args);
        sendToServer({ level: methodName, logger: String(loggerName), message: args.map(String).join(' ') });
      };
    };
    logger.rebuild();
  }

  return logger;
}

/**
 * Forward a log entry to the Rust backend for filesystem persistence.
 */
function sendToServer(entry: { level: string; logger: string; message: string }): void {
  import('@tauri-apps/api/core').then(({ invoke }) => {
    invoke('write_log', { entry }).catch(() => { /* ignore */ });
  }).catch(() => { /* not in Tauri */ });
}
