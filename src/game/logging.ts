/**
 * Logging module for Dungeons Crawl.
 *
 * Uses loglevel for per-package loggers with levels configured in
 * config/logging.yaml. In the Tauri native app, config is read and log
 * entries are written to disk via Rust commands (IPC, not HTTP).
 */
import log from 'loglevel';
import { invoke } from '@tauri-apps/api/core';

interface LoggingConfig {
  default: string;
  packages: Record<string, string>;
}

let config: LoggingConfig | null = null;

/**
 * Fetch logging config from the Rust backend and apply it to all loggers.
 * Must be called once at application startup before any loggers are used.
 */
export async function initLogging(): Promise<void> {
  try {
    config = await invoke<LoggingConfig>('get_log_config');
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
 * has a configured level it will already be applied.
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

/**
 * Forward a log entry to the Rust backend for filesystem persistence.
 * Fire-and-forget: errors do not propagate to the caller.
 */
export function sendToServer(entry: { level: string; logger: string; message: string }): void {
  invoke('write_log', { entry }).catch((err: unknown) => {
    console.error('[logging] Failed to send log to backend:', err);
  });
}
