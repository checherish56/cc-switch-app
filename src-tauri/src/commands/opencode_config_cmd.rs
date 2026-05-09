#![allow(non_snake_case)]

use crate::error::AppError;
use crate::opencode_config;
use serde_json::Value;
use serde_json::json;

/// Returns the full OpenCode config as a JSON value.
#[tauri::command]
pub async fn read_opencode_config_json() -> Result<Value, String> {
    opencode_config::read_opencode_config().map_err(|e| e.to_string())
}

/// Validates and writes the OpenCode config file.
#[tauri::command]
pub async fn write_opencode_config_json(config: Value) -> Result<(), String> {
    if !config.is_object() {
        return Err("Configuration must be a JSON object".to_string());
    }
    opencode_config::write_opencode_config(&config).map_err(|e| e.to_string())
}

/// Returns status info about the OpenCode config file.
#[tauri::command]
pub async fn get_opencode_config_status() -> Result<Value, String> {
    let config_path = opencode_config::get_opencode_config_path();
    Ok(json!({
        "configPath": config_path.to_string_lossy(),
        "exists": config_path.exists(),
    }))
}
