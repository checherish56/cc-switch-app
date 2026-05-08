# cc-switch Claude Code 配置 GUI 增强

## 概述

为 cc-switch（一个 Tauri 2 + React/TypeScript 桌面应用）增加了图形化的 Claude Code 配置编辑功能，使用户无需手动编辑 `~/.claude/settings.json` 即可配置权限、Hooks、沙箱等 Claude Code 功能。

---

## 新增/修改的文件

### 前端 (TypeScript/React)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types.ts` | 修改 | 新增 Claude Code 配置相关类型定义（`ClaudeSettingsFile`、`ClaudePermissions`、`ClaudeHookHandler`、`ClaudeSandboxConfig` 等 10+ 个类型） |
| `src/lib/api/claudeConfig.ts` | 新建 | 封装 Tauri invoke 调用 `get_claude_settings_file` / `set_claude_settings_file` |
| `src/lib/api/index.ts` | 修改 | 导出 `claudeConfigApi` |
| `src/hooks/useClaudeConfig.ts` | 新建 | React Query hooks：`useClaudeSettings()`（查询）和 `useSaveClaudeSettings()`（变更） |
| `src/components/settings/ClaudeConfigPanel.tsx` | 新建 | 约 1200 行的设置面板组件，包含 5 个 Accordion 分区 + 1 个受管密钥说明 |
| `src/components/settings/SettingsPage.tsx` | 修改 | 新增第 7 个 Tab 「Claude 配置」 |

### 后端 (Rust)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src-tauri/src/commands/claude_config.rs` | 新建 | 两个 Tauri 命令：读取/写入 `~/.claude/settings.json` |
| `src-tauri/src/commands/mod.rs` | 修改 | 注册新模块 |
| `src-tauri/src/lib.rs` | 修改 | 在 `generate_handler!` 中注册两个新命令 |
| `src-tauri/src/config.rs` | 修改 | `sort_json_keys` 函数从 `fn` 改为 `pub fn` |

### 国际化 (i18n)

| 文件 | 操作 |
|------|------|
| `src/i18n/locales/en.json` | 新增约 100 个 `claudeConfig` 命名空间键值 |
| `src/i18n/locales/zh.json` | 新增约 100 个中文翻译 |
| `src/i18n/locales/ja.json` | 新增约 100 个日文翻译 |

---

## 功能详情

### 1. 权限设置（Permissions）
- `defaultMode` 下拉选择：Default / Accept Edits / Bypass / Plan
- 允许列表 `allow[]`、拒绝列表 `deny[]`、询问列表 `ask[]` 的标签式编辑（支持 `Bash(npm run *)` 等权限模式语法）
- 额外目录 `additionalDirectories[]` 编辑

### 2. Hooks 配置
- 支持 15 个 Hook 事件（PreToolUse、PostToolUse、SessionStart 等）
- 每个事件支持多个 Matcher → Handler 链
- Handler 支持 4 种类型：command / http / prompt / agent
- 可配置 timeout 和 statusMessage

### 3. 沙箱配置（Sandbox）
- `enabled` 开关
- `autoAllowBashIfSandboxed` 开关
- `denyWrite` / `denyRead` 文件系统路径规则

### 4. 环境变量
- 非受管环境变量的键值对编辑
- 受管变量（如 `ANTHROPIC_API_KEY`）只读显示

### 5. 其他设置
- `cleanupPeriodDays` 数字输入
- `showTurnDuration` 开关
- `spinnerTipsEnabled` 开关  
- `attribution.commit` 文本输入
- `model` 只读显示（由 Provider 切换管理）

### 6. 受管密钥保护
- 写入时自动读取现有文件，保留 Provider 切换管理的密钥
- 管理范围：`ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN`、`ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL`、`ANTHROPIC_DEFAULT_HAIKU_MODEL`、`ANTHROPIC_DEFAULT_SONNET_MODEL`、`ANTHROPIC_DEFAULT_OPUS_MODEL`、`apiBaseUrl`、`primaryModel`、`smallFastModel`
- 保存时创建备份文件，原子写入保证安全

---

## 技术要点

- **合并写入（Merge-on-Write）**：保存时读取现有文件，保留受管密钥，合并用户编辑
- **原子写入**：先写临时文件再重命名，防止写入中断损坏配置文件
- **脏状态跟踪**：仅在有修改时启用保存按钮
- **React Query 状态管理**：使用 `@tanstack/react-query` v5 管理服务端状态
- **shadcn/ui 组件模式**：遵循项目现有的 Accordion、ToggleRow、Select 等组件风格

---

## 构建状态

执行 `npx tauri build --bundles msi --ignore-version-mismatches` 编译 Windows 64 位 MSI 安装包。

- 前端 Vite 构建：成功
- Rust 后端编译：进行中（cargo 进程运行中）
- 预期输出：`src-tauri/target/release/bundle/msi/cc-switch_*.msi`
