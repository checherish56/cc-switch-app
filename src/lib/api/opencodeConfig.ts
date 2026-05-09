import { invoke } from "@tauri-apps/api/core";

export const opencodeConfigApi = {
  async getConfig(): Promise<Record<string, unknown>> {
    return await invoke("read_opencode_config_json");
  },

  async setConfig(config: Record<string, unknown>): Promise<void> {
    return await invoke("write_opencode_config_json", { config });
  },

  async getConfigStatus(): Promise<{
    configPath: string;
    exists: boolean;
  }> {
    return await invoke("get_opencode_config_status");
  },
};
