use serde::Serialize;
use std::process::Command;
use tauri::Emitter;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize)]
pub struct ToolInstallStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub install_path: Option<String>,
    pub detection_method: String,
    pub npm_available: bool,
}

// Backward-compat alias
pub type ClaudeInstallStatus = ToolInstallStatus;

#[derive(Debug, Clone, Serialize)]
pub struct InstallProgress {
    pub stage: String,
    pub message: String,
    pub percent: u8,
}

struct ToolInfo {
    npm_package: &'static str,
    binary_name: &'static str,
    binary_name_win: &'static str,
    event_name: &'static str,
    display_name: &'static str,
}

const TOOL_CLAUDE: ToolInfo = ToolInfo {
    npm_package: "@anthropic-ai/claude-code",
    binary_name: "claude",
    binary_name_win: "claude.cmd",
    event_name: "claude-install-progress",
    display_name: "Claude Code",
};

const TOOL_CODEX: ToolInfo = ToolInfo {
    npm_package: "@openai/codex",
    binary_name: "codex",
    binary_name_win: "codex.cmd",
    event_name: "codex-install-progress",
    display_name: "Codex",
};

const TOOL_GEMINI: ToolInfo = ToolInfo {
    npm_package: "@google/gemini-cli",
    binary_name: "gemini",
    binary_name_win: "gemini.cmd",
    event_name: "gemini-install-progress",
    display_name: "Gemini CLI",
};

// OpenCode is special: installed via shell script, not npm
const TOOL_OPENCODE: ToolInfo = ToolInfo {
    npm_package: "", // not on npm
    binary_name: "opencode",
    binary_name_win: "opencode.exe",
    event_name: "opencode-install-progress",
    display_name: "OpenCode",
};

const TOOL_OPENCLAW: ToolInfo = ToolInfo {
    npm_package: "openclaw",
    binary_name: "openclaw",
    binary_name_win: "openclaw.cmd",
    event_name: "openclaw-install-progress",
    display_name: "OpenClaw",
};

const TOOL_HERMES: ToolInfo = ToolInfo {
    npm_package: "", // Python-based, installed via pip
    binary_name: "hermes",
    binary_name_win: "hermes.exe",
    event_name: "hermes-install-progress",
    display_name: "Hermes Agent",
};

pub(crate) fn is_chinese_locale() -> bool {
    std::env::var("LANG")
        .or_else(|_| std::env::var("LC_ALL"))
        .or_else(|_| std::env::var("LC_MESSAGES"))
        .map(|lang| lang.starts_with("zh"))
        .unwrap_or(false)
}

fn npm_exists() -> bool {
    let result = run_command("npm --version");
    result.map(|o| o.status.success()).unwrap_or(false)
}

fn run_command(cmd_str: &str) -> std::io::Result<std::process::Output> {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", cmd_str])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
    }
    #[cfg(not(target_os = "windows"))]
    {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "sh".to_string());
        Command::new(&shell).arg("-c").arg(cmd_str).output()
    }
}

fn check_via_npm_list(package_name: &str) -> Option<(String, String)> {
    let output = run_command(&format!(
        "npm list -g {} --depth=0 --json",
        package_name
    ))
    .ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(&stdout).ok()?;
    let deps = parsed.get("dependencies")?;
    let pkg = deps.get(package_name)?;
    let version = pkg
        .get("version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let install_path = pkg
        .get("_resolved")
        .and_then(|r| r.as_str())
        .map(|s| s.to_string());
    version.map(|v| (v, install_path.unwrap_or_default()))
}

fn scan_for_binary(binary_name: &str) -> Option<(String, String)> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("where")
            .arg(binary_name)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .ok()?;
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout)
                .lines()
                .next()
                .map(|l| l.trim().to_string())?;
            if !path.is_empty() {
                return try_get_version_at_path(&path).map(|v| (v, path));
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("which")
            .arg(binary_name)
            .output()
            .ok()?;
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return try_get_version_at_path(&path).map(|v| (v, path));
            }
        }
    }

    let home = dirs::home_dir()?;
    let base_name = binary_name.trim_end_matches(".cmd").trim_end_matches(".exe");
    let win_name = format!("{}.cmd", base_name);

    let candidates: Vec<std::path::PathBuf> = if cfg!(target_os = "windows") {
        vec![
            home.join("AppData").join("Roaming").join("npm").join(&win_name),
            home.join("AppData").join("Local").join("pnpm").join(&win_name),
            home.join("AppData").join("Local").join("Yarn").join("bin").join(&win_name),
        ]
    } else {
        vec![
            home.join(".local").join("bin").join(base_name),
            home.join(".npm-global").join("bin").join(base_name),
            home.join(".volta").join("bin").join(base_name),
            home.join("n").join("bin").join(base_name),
        ]
    };

    for candidate in &candidates {
        if candidate.exists() {
            if let Some(v) = try_get_version_at_path(&candidate.to_string_lossy()) {
                return Some((v, candidate.to_string_lossy().to_string()));
            }
        }
    }

    // OpenCode special paths
    if base_name == "opencode" {
        let extra = if cfg!(target_os = "windows") {
            vec![
                home.join(".opencode").join("bin").join("opencode.exe"),
            ]
        } else {
            vec![
                home.join(".opencode").join("bin").join("opencode"),
                home.join("bin").join("opencode"),
            ]
        };
        for p in &extra {
            if p.exists() {
                if let Some(v) = try_get_version_at_path(&p.to_string_lossy()) {
                    return Some((v, p.to_string_lossy().to_string()));
                }
            }
        }
    }

    None
}

fn check_tool(tool: &ToolInfo) -> ToolInstallStatus {
    let npm_avail = npm_exists();

    if npm_avail && !tool.npm_package.is_empty() {
        if let Some((version, path)) = check_via_npm_list(tool.npm_package) {
            return ToolInstallStatus {
                installed: true,
                version: Some(version),
                install_path: Some(path),
                detection_method: "npm_list".to_string(),
                npm_available: true,
            };
        }
    }

    let search_name = if cfg!(target_os = "windows") {
        tool.binary_name_win
    } else {
        tool.binary_name
    };

    if let Some((version, path)) = scan_for_binary(search_name) {
        return ToolInstallStatus {
            installed: true,
            version: Some(version),
            install_path: Some(path),
            detection_method: "path_scan".to_string(),
            npm_available: npm_avail,
        };
    }

    ToolInstallStatus {
        installed: false,
        version: None,
        install_path: None,
        detection_method: "not_found".to_string(),
        npm_available: npm_avail,
    }
}

fn try_get_version_at_path(path: &str) -> Option<String> {
    let output = run_command(&format!("\"{}\" --version", path)).ok()?;
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let combined = format!("{}{}", stdout, stderr);
        extract_version(&combined)
    } else {
        None
    }
}

fn is_script_policy_error(output: &std::process::Output) -> bool {
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let combined = format!("{}{}", stderr, stdout);
    let lower = combined.to_lowercase();
    lower.contains("running scripts is disabled")
        || lower.contains("cannot be loaded because")
        || lower.contains("pssecurityexception")
        || lower.contains("unauthorizedaccess")
        || (lower.contains("eperm") && lower.contains("spawn"))
}

fn extract_version(raw: &str) -> Option<String> {
    let re = regex::Regex::new(r"\d+\.\d+\.\d+(-[\w.]+)?").ok()?;
    re.find(raw).map(|m| m.as_str().to_string())
}

fn pip_exists() -> bool {
    let result = run_command("pip --version");
    result.map(|o| o.status.success()).unwrap_or(false)
}

fn check_via_pip(package: &str) -> Option<(String, String)> {
    let output = run_command(&format!("pip show {}", package)).ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut version = None;
    let mut location = None;
    for line in stdout.lines() {
        if let Some(v) = line.strip_prefix("Version: ") {
            version = Some(v.trim().to_string());
        }
        if let Some(l) = line.strip_prefix("Location: ") {
            location = Some(l.trim().to_string());
        }
    }
    version.map(|v| (v, location.unwrap_or_default()))
}

fn check_hermes_inner() -> ToolInstallStatus {
    // Hermes Agent is Python-based. Try binary scan for both names first.
    // The binary may be named `hermes` or `hermes-agent`.
    for name in &["hermes", "hermes-agent"] {
        let search_name = if cfg!(target_os = "windows") {
            format!("{}.exe", name)
        } else {
            name.to_string()
        };
        if let Some((version, path)) = scan_for_binary(&search_name) {
            return ToolInstallStatus {
                installed: true,
                version: Some(version),
                install_path: Some(path),
                detection_method: "path_scan".to_string(),
                npm_available: false,
            };
        }
    }

    // Check pip as fallback
    if let Some((version, location)) = check_via_pip("hermes-agent") {
        return ToolInstallStatus {
            installed: true,
            version: Some(version),
            install_path: Some(location),
            detection_method: "pip_show".to_string(),
            npm_available: false,
        };
    }

    ToolInstallStatus {
        installed: false,
        version: None,
        install_path: None,
        detection_method: "not_found".to_string(),
        npm_available: false,
    }
}

// ─── Tauri commands ────────────────────────────────────────

#[tauri::command]
pub async fn check_claude_installed() -> Result<ToolInstallStatus, String> {
    Ok(check_tool(&TOOL_CLAUDE))
}

#[tauri::command]
pub async fn check_codex_installed() -> Result<ToolInstallStatus, String> {
    Ok(check_tool(&TOOL_CODEX))
}

#[tauri::command]
pub async fn check_gemini_installed() -> Result<ToolInstallStatus, String> {
    Ok(check_tool(&TOOL_GEMINI))
}

#[tauri::command]
pub async fn check_opencode_installed() -> Result<ToolInstallStatus, String> {
    Ok(check_tool(&TOOL_OPENCODE))
}

#[tauri::command]
pub async fn check_openclaw_installed() -> Result<ToolInstallStatus, String> {
    Ok(check_tool(&TOOL_OPENCLAW))
}

#[tauri::command]
pub async fn check_hermes_installed() -> Result<ToolInstallStatus, String> {
    Ok(check_hermes_inner())
}

#[tauri::command]
pub async fn install_claude_code(app_handle: tauri::AppHandle) -> Result<(), String> {
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        run_install_task(handle, &TOOL_CLAUDE).await;
    });
    Ok(())
}

#[tauri::command]
pub async fn install_codex(app_handle: tauri::AppHandle) -> Result<(), String> {
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        run_install_task(handle, &TOOL_CODEX).await;
    });
    Ok(())
}

#[tauri::command]
pub async fn install_gemini(app_handle: tauri::AppHandle) -> Result<(), String> {
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        run_install_task(handle, &TOOL_GEMINI).await;
    });
    Ok(())
}

#[tauri::command]
pub async fn install_opencode(app_handle: tauri::AppHandle) -> Result<(), String> {
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        run_install_task(handle, &TOOL_OPENCODE).await;
    });
    Ok(())
}

#[tauri::command]
pub async fn install_openclaw(app_handle: tauri::AppHandle) -> Result<(), String> {
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        run_install_task(handle, &TOOL_OPENCLAW).await;
    });
    Ok(())
}

#[tauri::command]
pub async fn install_hermes(app_handle: tauri::AppHandle) -> Result<(), String> {
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        run_install_task(handle, &TOOL_HERMES).await;
    });
    Ok(())
}

// ─── Install task ──────────────────────────────────────────

async fn run_install_task(app_handle: tauri::AppHandle, tool: &ToolInfo) {
    let emit = |stage: &str, message: &str, percent: u8| {
        let _ = app_handle.emit(
            tool.event_name,
            InstallProgress {
                stage: stage.to_string(),
                message: message.to_string(),
                percent,
            },
        );
    };

    let has_npm = npm_exists();
    let is_cn = is_chinese_locale();

    // Step 1: Install Node.js if npm is missing
    if !has_npm {
        emit("installing_node", &format!("{} requires Node.js. Installing Node.js LTS...", tool.display_name), 5);

        let ok = install_nodejs(is_cn);
        if !ok {
            emit("failed", "Failed to install Node.js automatically. Please install it from https://nodejs.org", 0);
            return;
        }

        emit("installing_node", "Node.js installed, verifying npm...", 25);

        for _ in 0..6 {
            std::thread::sleep(std::time::Duration::from_secs(2));
            if npm_exists() {
                emit("installing_node", "Node.js + npm ready", 30);
                break;
            }
        }

        if !npm_exists() {
            emit("failed", "Node.js installed but npm not found. Please restart the app and try again.", 0);
            return;
        }
    }

    let base_pct: u8 = if has_npm { 35 } else { 30 };

    // Step 2: Install the tool
    if tool.npm_package.is_empty() {
        if tool.binary_name == "hermes" {
            run_hermes_install(emit).await;
        } else {
            // OpenCode: install via shell script
            run_opencode_install(emit).await;
        }
        return;
    }

    let install_cmd = if is_cn {
        format!(
            "npm install -g {} --registry=https://registry.npmmirror.com",
            tool.npm_package
        )
    } else {
        format!("npm install -g {}", tool.npm_package)
    };

    let install_msg = if is_cn {
        format!("Installing {} via npmmirror.com...", tool.display_name)
    } else {
        format!("Installing {}...", tool.display_name)
    };
    emit("installing", &install_msg, base_pct);

    match run_command(&install_cmd) {
        Ok(output) => {
            if output.status.success() {
                emit("completed", "Installation complete", 100);
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let stdout = String::from_utf8_lossy(&output.stdout);
                let err = if stderr.is_empty() { stdout } else { stderr };
                let prefix = if is_script_policy_error(&output) {
                    "[SCRIPT_POLICY]"
                } else {
                    ""
                };
                emit("failed", &format!("{}Install failed: {}", prefix, err.trim()), 0);
            }
        }
        Err(e) => {
            emit("failed", &format!("Failed to run npm: {}", e), 0);
        }
    }
}

async fn run_opencode_install(
    emit: impl Fn(&str, &str, u8),
) {
    emit("installing", "Installing OpenCode via install script...", 40);

    let is_cn = is_chinese_locale();
    let install_url = if is_cn {
        "https://ghfast.top/https://raw.githubusercontent.com/anomalyco/opencode/main/install.sh"
    } else {
        "https://raw.githubusercontent.com/anomalyco/opencode/main/install.sh"
    };

    let cmd = if cfg!(target_os = "windows") {
        format!(
            "powershell -Command \"Invoke-WebRequest -Uri '{}' -UseBasicParsing | Invoke-Expression\"",
            install_url
        )
    } else {
        format!("curl -fsSL {} | bash", install_url)
    };

    match run_command(&cmd) {
        Ok(output) => {
            if output.status.success() {
                emit("completed", "OpenCode installation complete", 100);
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                emit("failed", &format!("Install failed: {}", stderr.trim()), 0);
            }
        }
        Err(e) => {
            emit("failed", &format!("Failed to run installer: {}", e), 0);
        }
    }
}

async fn run_hermes_install(
    emit: impl Fn(&str, &str, u8),
) {
    // Hermes Agent is Python-based. Try pip first, then install script.
    if pip_exists() {
        emit("installing", "Installing Hermes Agent via pip...", 45);
        match run_command("pip install hermes-agent") {
            Ok(output) => {
                if output.status.success() {
                    emit("completed", "Hermes Agent installation complete", 100);
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    let err = if stderr.is_empty() { stdout } else { stderr };
                    emit("failed", &format!("pip install failed: {}", err.trim()), 0);
                }
            }
            Err(e) => {
                emit("failed", &format!("Failed to run pip: {}", e), 0);
            }
        }
        return;
    }

    // Fallback: install script
    let is_cn = is_chinese_locale();
    let install_url = if is_cn {
        "https://ghfast.top/https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh"
    } else {
        "https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh"
    };

    emit("installing", "Installing Hermes Agent via install script...", 40);

    let cmd = if cfg!(target_os = "windows") {
        // Hermes doesn't have an official install.ps1, use pip message
        emit("failed", "Hermes Agent requires Python. Please install Python from https://python.org, then retry.", 0);
        return;
    } else {
        format!("curl -fsSL {} | bash", install_url)
    };

    match run_command(&cmd) {
        Ok(output) => {
            if output.status.success() {
                emit("completed", "Hermes Agent installation complete", 100);
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                emit("failed", &format!("Install failed: {}", stderr.trim()), 0);
            }
        }
        Err(e) => {
            emit("failed", &format!("Failed to run installer: {}", e), 0);
        }
    }
}

// ─── Node.js installers (per-platform) ─────────────────────

fn install_nodejs(use_mirror: bool) -> bool {
    #[cfg(target_os = "windows")]
    return install_nodejs_windows(use_mirror);
    #[cfg(target_os = "macos")]
    return install_nodejs_macos();
    #[cfg(target_os = "linux")]
    return install_nodejs_linux(use_mirror);
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    false
}

#[cfg(target_os = "windows")]
fn install_nodejs_windows(use_mirror: bool) -> bool {
    // Strategy 1: winget (built into Windows 10 1709+ / 11)
    let winget_cmd = "winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements";
    if let Ok(output) = run_command(winget_cmd) {
        if output.status.success() {
            return true;
        }
    }

    // Strategy 2: download MSI and run msiexec silently
    let node_version = "v22.18.0";
    let msi_url = if use_mirror {
        format!("https://npmmirror.com/mirrors/node/{node_version}/node-{node_version}-x64.msi")
    } else {
        format!("https://nodejs.org/dist/{node_version}/node-{node_version}-x64.msi")
    };

    let msi_path = std::env::temp_dir().join("nodejs-installer.msi");

    let dl = format!(
        "powershell -Command \"Invoke-WebRequest -Uri '{}' -OutFile '{}' -UseBasicParsing\"",
        msi_url,
        msi_path.display()
    );
    if let Ok(out) = run_command(&dl) {
        if out.status.success() && msi_path.exists() {
            let install = format!(
                "msiexec /i \"{}\" /quiet /norestart",
                msi_path.display()
            );
            if let Ok(out) = run_command(&install) {
                return out.status.success();
            }
        }
    }

    false
}

#[cfg(target_os = "macos")]
fn install_nodejs_macos() -> bool {
    // Homebrew
    if let Ok(out) = run_command("brew install node") {
        if out.status.success() {
            return true;
        }
    }
    // Fallback: official pkg
    if let Ok(out) = run_command(
        "curl -fsSL https://nodejs.org/dist/v22.18.0/node-v22.18.0.pkg -o /tmp/nodejs.pkg && sudo installer -pkg /tmp/nodejs.pkg -target /",
    ) {
        return out.status.success();
    }
    false
}

#[cfg(target_os = "linux")]
fn install_nodejs_linux(use_mirror: bool) -> bool {
    let registry = if use_mirror {
        "https://npmmirror.com/dist/"
    } else {
        "https://deb.nodesource.com/"
    };

    // Debian / Ubuntu
    let apt = format!(
        "curl -fsSL {}setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs",
        registry
    );
    if let Ok(out) = run_command(&apt) {
        if out.status.success() && npm_exists() {
            return true;
        }
    }

    // RHEL / Fedora
    let rpm = format!(
        "curl -fsSL {}setup_22.x | sudo -E bash - && sudo dnf install -y nodejs",
        registry
    );
    if let Ok(out) = run_command(&rpm) {
        if out.status.success() && npm_exists() {
            return true;
        }
    }

    // snap
    if let Ok(out) = run_command("sudo snap install node --classic") {
        if out.status.success() && npm_exists() {
            return true;
        }
    }

    false
}
