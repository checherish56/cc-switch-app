use std::fs;

use chrono::Local;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::config::{self, get_app_config_dir, get_claude_settings_path};
use crate::error::AppError;
use crate::settings::effective_backup_retain_count;

/// Provider-managed top-level keys that the user should not edit directly
const MANAGED_TOP_LEVEL_KEYS: &[&str] = &["apiBaseUrl", "primaryModel", "smallFastModel"];

/// Provider-managed env keys that the user should not edit directly
const MANAGED_ENV_KEYS: &[&str] = &[
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_MODEL",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeSettingsReadResult {
    pub settings: Value,
    pub managed_env_keys: Vec<String>,
    pub managed_top_level_keys: Vec<String>,
    pub config_path: String,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeSettingsWriteOutcome {
    pub backup_path: Option<String>,
}

/// Filter out provider-managed keys from the settings value (for display only)
fn filter_managed_keys(value: &Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut filtered = Map::new();
            for (key, val) in map {
                if key == "env" {
                    if let Value::Object(env_map) = val {
                        let mut filtered_env = Map::new();
                        for (env_key, env_val) in env_map {
                            if !MANAGED_ENV_KEYS.contains(&env_key.as_str()) {
                                filtered_env.insert(env_key.clone(), env_val.clone());
                            }
                        }
                        if !filtered_env.is_empty() {
                            filtered.insert(key.clone(), Value::Object(filtered_env));
                        }
                    }
                } else if !MANAGED_TOP_LEVEL_KEYS.contains(&key.as_str()) {
                    filtered.insert(key.clone(), val.clone());
                }
            }
            Value::Object(filtered)
        }
        other => other.clone(),
    }
}

/// Read the Claude Code settings.json file, returning filtered user-editable settings
/// plus metadata about which keys are provider-managed.
#[tauri::command]
pub async fn get_claude_settings_file() -> Result<ClaudeSettingsReadResult, String> {
    let config_path = get_claude_settings_path();
    let exists = config_path.exists();

    let (settings, managed_env_keys, managed_top_level_keys) = if exists {
        let content = fs::read_to_string(&config_path).map_err(|e| {
            format!(
                "Failed to read Claude config ({}): {}",
                config_path.display(),
                e
            )
        })?;

        let full_value: Value = serde_json::from_str(&content).map_err(|e| {
            format!(
                "Failed to parse Claude config as JSON ({}): {}",
                config_path.display(),
                e
            )
        })?;

        // Collect managed env keys actually present in the file
        let actual_managed_env: Vec<String> = full_value
            .get("env")
            .and_then(|e| e.as_object())
            .map(|env_map| {
                env_map
                    .keys()
                    .filter(|k| MANAGED_ENV_KEYS.contains(&k.as_str()))
                    .cloned()
                    .collect()
            })
            .unwrap_or_default();

        // Collect managed top-level keys actually present in the file
        let actual_managed_top: Vec<String> = full_value
            .as_object()
            .map(|obj| {
                obj.keys()
                    .filter(|k| MANAGED_TOP_LEVEL_KEYS.contains(&k.as_str()))
                    .cloned()
                    .collect()
            })
            .unwrap_or_default();

        (filter_managed_keys(&full_value), actual_managed_env, actual_managed_top)
    } else {
        (Value::Object(Map::new()), vec![], vec![])
    };

    Ok(ClaudeSettingsReadResult {
        settings,
        managed_env_keys: managed_env_keys
            .into_iter()
            .chain(MANAGED_ENV_KEYS.iter().map(|s| s.to_string()))
            .collect::<std::collections::BTreeSet<_>>()
            .into_iter()
            .collect(),
        managed_top_level_keys: managed_top_level_keys
            .into_iter()
            .chain(MANAGED_TOP_LEVEL_KEYS.iter().map(|s| s.to_string()))
            .collect::<std::collections::BTreeSet<_>>()
            .into_iter()
            .collect(),
        config_path: config_path.display().to_string(),
        exists,
    })
}

fn create_claude_settings_backup(source: &str) -> Result<std::path::PathBuf, AppError> {
    let backup_dir = get_app_config_dir().join("backups").join("claude_settings");
    fs::create_dir_all(&backup_dir).map_err(|e| AppError::io(&backup_dir, e))?;

    let base_id = format!("claude_settings_{}", Local::now().format("%Y%m%d_%H%M%S"));
    let mut filename = format!("{base_id}.json");
    let mut backup_path = backup_dir.join(&filename);
    let mut counter = 1;

    while backup_path.exists() {
        filename = format!("{base_id}_{counter}.json");
        backup_path = backup_dir.join(&filename);
        counter += 1;
    }

    config::atomic_write(&backup_path, source.as_bytes())?;
    cleanup_claude_settings_backups(&backup_dir)?;
    Ok(backup_path)
}

fn cleanup_claude_settings_backups(dir: &std::path::Path) -> Result<(), AppError> {
    let retain = effective_backup_retain_count();
    let mut entries = fs::read_dir(dir)
        .map_err(|e| AppError::io(dir, e))?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry
                .path()
                .extension()
                .map(|ext| ext == "json")
                .unwrap_or(false)
        })
        .collect::<Vec<_>>();

    if entries.len() <= retain {
        return Ok(());
    }

    entries.sort_by_key(|entry| entry.metadata().and_then(|m| m.modified()).ok());

    let remove_count = entries.len().saturating_sub(retain);
    for entry in entries.into_iter().take(remove_count) {
        if let Err(err) = fs::remove_file(entry.path()) {
            log::warn!(
                "Failed to remove old Claude settings backup {}: {err}",
                entry.path().display()
            );
        }
    }
    Ok(())
}

/// Merge user-editable settings back into the Claude Code settings.json file,
/// preserving provider-managed keys from the existing file.
#[tauri::command]
pub async fn set_claude_settings_file(
    settings: Value,
) -> Result<ClaudeSettingsWriteOutcome, String> {
    let config_path = get_claude_settings_path();

    // Read the existing file to preserve provider-managed keys
    let mut existing: Value = if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| {
            format!(
                "Failed to read existing Claude config ({}): {}",
                config_path.display(),
                e
            )
        })?;

        serde_json::from_str(&content).map_err(|e| {
            format!(
                "Failed to parse existing Claude config ({}): {}",
                config_path.display(),
                e
            )
        })?
    } else {
        Value::Object(Map::new())
    };

    // Merge incoming settings into existing, preserving managed keys
    if let Value::Object(ref mut existing_map) = existing {
        // Preserve provider-managed top-level keys
        let managed_top_snapshot: Map<String, Value> = existing_map
            .iter()
            .filter(|(k, _)| MANAGED_TOP_LEVEL_KEYS.contains(&k.as_str()))
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();

        // Preserve provider-managed env keys
        let managed_env_snapshot: Map<String, Value> = existing_map
            .get("env")
            .and_then(|e| e.as_object())
            .map(|env_map| {
                env_map
                    .iter()
                    .filter(|(k, _)| MANAGED_ENV_KEYS.contains(&k.as_str()))
                    .map(|(k, v)| (k.clone(), v.clone()))
                    .collect()
            })
            .unwrap_or_default();

        // Clear existing map (to replace with incoming)
        existing_map.clear();

        // Merge incoming settings
        if let Value::Object(incoming_map) = &settings {
            for (key, val) in incoming_map {
                if key == "env" {
                    if let Value::Object(incoming_env) = val {
                        let mut merged_env = Map::new();
                        // Start with managed env vars
                        for (mk, mv) in &managed_env_snapshot {
                            merged_env.insert(mk.clone(), mv.clone());
                        }
                        // Overlay user env vars (already filtered by frontend, but safe-guard here)
                        for (ek, ev) in incoming_env {
                            if !MANAGED_ENV_KEYS.contains(&ek.as_str()) {
                                merged_env.insert(ek.clone(), ev.clone());
                            }
                        }
                        existing_map.insert("env".to_string(), Value::Object(merged_env));
                    }
                } else if !MANAGED_TOP_LEVEL_KEYS.contains(&key.as_str()) {
                    existing_map.insert(key.clone(), val.clone());
                }
            }
        }

        // Restore managed top-level keys
        for (mk, mv) in &managed_top_snapshot {
            existing_map.insert(mk.clone(), mv.clone());
        }
    }

    // Sort keys for deterministic output
    let sorted = config::sort_json_keys(&existing);

    let new_content = serde_json::to_string_pretty(&sorted).map_err(|e| {
        format!("Failed to serialize Claude config: {e}")
    })?;

    // Create backup before writing if file exists
    let backup_path = if config_path.exists() {
        let old_content = fs::read_to_string(&config_path).map_err(|e| {
            format!(
                "Failed to read Claude config for backup ({}): {}",
                config_path.display(),
                e
            )
        })?;

        // Skip backup if content is unchanged
        if old_content == new_content {
            None
        } else {
            Some(
                create_claude_settings_backup(&old_content)
                    .map_err(|e| e.to_string())?
                    .display()
                    .to_string(),
            )
        }
    } else {
        None
    };

    // Atomic write
    config::atomic_write(&config_path, new_content.as_bytes()).map_err(|e| {
        format!(
            "Failed to write Claude config ({}): {}",
            config_path.display(),
            e
        )
    })?;

    Ok(ClaudeSettingsWriteOutcome { backup_path })
}
