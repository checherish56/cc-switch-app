#![allow(non_snake_case)]

use crate::codex_config;
use crate::config::write_json_file;
use crate::error::AppError;
use serde_json::{json, Value};

/// Returns the raw content of ~/.codex/config.toml, or an empty string if it doesn't exist.
#[tauri::command]
pub async fn get_codex_config_text() -> Result<String, String> {
    codex_config::read_codex_config_text().map_err(|e| e.to_string())
}

/// Validates TOML syntax and writes ~/.codex/config.toml.
#[tauri::command]
pub async fn set_codex_config_text(config_text: String) -> Result<(), String> {
    codex_config::validate_config_toml(&config_text).map_err(|e| e.to_string())?;
    let config_path = codex_config::get_codex_config_path();
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::io(parent, e).to_string())?;
    }
    crate::config::write_text_file(&config_path, &config_text).map_err(|e| e.to_string())
}

/// Reads ~/.codex/auth.json and returns the JSON value.
#[tauri::command]
pub async fn read_codex_auth_json() -> Result<Value, String> {
    let path = codex_config::get_codex_auth_path();
    if !path.exists() {
        return Ok(json!({}));
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| AppError::io(&path, e).to_string())?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Invalid auth.json: {e}"))
}

/// Writes ~/.codex/auth.json.
#[tauri::command]
pub async fn set_codex_auth_json(auth: Value) -> Result<(), String> {
    let path = codex_config::get_codex_auth_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::io(parent, e).to_string())?;
    }
    write_json_file(&path, &auth).map_err(|e| e.to_string())
}

/// Returns status info about Codex config files.
#[tauri::command]
pub async fn get_codex_config_status() -> Result<Value, String> {
    let config_path = codex_config::get_codex_config_path();
    let auth_path = codex_config::get_codex_auth_path();
    Ok(json!({
        "configPath": config_path.to_string_lossy(),
        "authPath": auth_path.to_string_lossy(),
        "configExists": config_path.exists(),
        "authExists": auth_path.exists(),
    }))
}

/// Updates a single field in Codex config.toml using toml_edit (preserves formatting/comments).
/// Supported fields: "base_url", "model".
#[tauri::command]
pub async fn update_codex_toml_section(field: String, value: String) -> Result<String, String> {
    let current = codex_config::read_codex_config_text().map_err(|e| e.to_string())?;
    codex_config::update_codex_toml_field(&current, &field, &value)
}
