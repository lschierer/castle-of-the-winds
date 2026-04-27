#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

/// Logging config matching config/logging.yaml
#[derive(Debug, Serialize, Deserialize, Clone)]
struct LoggingConfig {
    default: String,
    packages: std::collections::HashMap<String, String>,
}

/// Shared state: log file handle + resolved paths
struct AppState {
    log_file: Mutex<Option<fs::File>>,
    config_dir: PathBuf,
}

fn resolve_log_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("dungeons-crawl")
        .join("logs")
}

fn resolve_config_dir() -> PathBuf {
    // In development, use the project's config/ directory.
    // In production, use the platform config directory.
    let dev_config = PathBuf::from("config");
    if dev_config.exists() {
        return dev_config;
    }
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("dungeons-crawl")
}

fn open_log_file(log_dir: &PathBuf) -> Option<fs::File> {
    fs::create_dir_all(log_dir).ok()?;
    let path = log_dir.join("app.log");
    fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .ok()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LogEntry {
    level: String,
    logger: String,
    message: String,
}

#[tauri::command]
fn get_log_config(state: State<AppState>) -> Result<LoggingConfig, String> {
    let config_path = state.config_dir.join("logging.yaml");
    let raw = fs::read_to_string(&config_path).map_err(|e| {
        eprintln!("[log-config] Failed to read {}: {e}", config_path.display());
        e.to_string()
    })?;
    serde_yaml::from_str(&raw).map_err(|e| {
        eprintln!("[log-config] Failed to parse YAML: {e}");
        e.to_string()
    })
}

#[tauri::command]
fn write_log(entry: LogEntry, state: State<AppState>) -> Result<(), String> {
    let timestamp = Local::now().format("%Y-%m-%dT%H:%M:%S%.3f");
    let line = format!(
        "[{}] [{:<5}] [{}] {}\n",
        timestamp,
        entry.level.to_uppercase(),
        entry.logger,
        entry.message
    );

    // Write to stderr so it appears in the terminal during development
    eprint!("{line}");

    // Write to log file
    if let Ok(mut guard) = state.log_file.lock() {
        if let Some(ref mut file) = *guard {
            let _ = file.write_all(line.as_bytes());
        }
    }

    Ok(())
}

fn main() {
    let log_dir = resolve_log_dir();
    let config_dir = resolve_config_dir();
    let log_file = open_log_file(&log_dir);

    eprintln!("[tauri] Log dir: {}", log_dir.display());
    eprintln!("[tauri] Config dir: {}", config_dir.display());

    tauri::Builder::default()
        .manage(AppState {
            log_file: Mutex::new(log_file),
            config_dir,
        })
        .invoke_handler(tauri::generate_handler![get_log_config, write_log])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
