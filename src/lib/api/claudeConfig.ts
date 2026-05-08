import { invoke } from "@tauri-apps/api/core";
import type {
  ClaudeSettingsFile,
  ClaudeSettingsReadResult,
  ClaudeSettingsWriteOutcome,
} from "@/types";

export const claudeConfigApi = {
  async getSettings(): Promise<ClaudeSettingsReadResult> {
    return await invoke("get_claude_settings_file");
  },

  async setSettings(
    settings: ClaudeSettingsFile,
  ): Promise<ClaudeSettingsWriteOutcome> {
    return await invoke("set_claude_settings_file", { settings });
  },
};
