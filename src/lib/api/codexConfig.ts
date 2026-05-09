import { invoke } from "@tauri-apps/api/core";

export const codexConfigApi = {
  async getConfigText(): Promise<string> {
    return await invoke("get_codex_config_text");
  },

  async setConfigText(configText: string): Promise<void> {
    return await invoke("set_codex_config_text", { configText });
  },

  async readAuthJson(): Promise<Record<string, unknown>> {
    return await invoke("read_codex_auth_json");
  },

  async setAuthJson(auth: Record<string, unknown>): Promise<void> {
    return await invoke("set_codex_auth_json", { auth });
  },

  async getConfigStatus(): Promise<{
    configPath: string;
    authPath: string;
    configExists: boolean;
    authExists: boolean;
  }> {
    return await invoke("get_codex_config_status");
  },

  async updateTomlSection(field: string, value: string): Promise<string> {
    return await invoke("update_codex_toml_section", { field, value });
  },
};
