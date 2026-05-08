import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import type { InstallProgress } from "@/lib/api/settings";
import { useState, useEffect, useCallback } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type ToolId = "claude" | "codex" | "gemini" | "opencode" | "openclaw" | "hermes";

const TOOL_CONFIG: Record<
  ToolId,
  {
    event: string;
    checkFn: () => Promise<{ installed: boolean; version: string | null; install_path: string | null; detection_method: string; npm_available: boolean }>;
    installFn: () => Promise<void>;
    queryKey: readonly [string, string];
  }
> = {
  claude: {
    event: "claude-install-progress",
    checkFn: () => settingsApi.checkClaudeInstalled(),
    installFn: () => settingsApi.installClaudeCode(),
    queryKey: ["claudeInstall", "status"] as const,
  },
  codex: {
    event: "codex-install-progress",
    checkFn: () => settingsApi.checkCodexInstalled(),
    installFn: () => settingsApi.installCodex(),
    queryKey: ["codexInstall", "status"] as const,
  },
  gemini: {
    event: "gemini-install-progress",
    checkFn: () => settingsApi.checkGeminiInstalled(),
    installFn: () => settingsApi.installGemini(),
    queryKey: ["geminiInstall", "status"] as const,
  },
  opencode: {
    event: "opencode-install-progress",
    checkFn: () => settingsApi.checkOpencodeInstalled(),
    installFn: () => settingsApi.installOpencode(),
    queryKey: ["opencodeInstall", "status"] as const,
  },
  openclaw: {
    event: "openclaw-install-progress",
    checkFn: () => settingsApi.checkOpenclawInstalled(),
    installFn: () => settingsApi.installOpenclaw(),
    queryKey: ["openclawInstall", "status"] as const,
  },
  hermes: {
    event: "hermes-install-progress",
    checkFn: () => settingsApi.checkHermesInstalled(),
    installFn: () => settingsApi.installHermes(),
    queryKey: ["hermesInstall", "status"] as const,
  },
};

export function useToolInstallStatus(toolId: ToolId) {
  const cfg = TOOL_CONFIG[toolId];
  return useQuery({
    queryKey: cfg.queryKey,
    queryFn: cfg.checkFn,
    staleTime: 60_000,
    enabled: true,
  });
}

export function useInstallTool(toolId: ToolId) {
  const queryClient = useQueryClient();
  const cfg = TOOL_CONFIG[toolId];
  const [progress, setProgress] = useState<InstallProgress | null>(null);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    const setup = async () => {
      unlisten = await listen<InstallProgress>(cfg.event, (event) => {
        setProgress(event.payload);
        if (
          event.payload.stage === "completed" ||
          event.payload.stage === "failed"
        ) {
          queryClient.invalidateQueries({ queryKey: cfg.queryKey });
        }
      });
    };
    setup();
    return () => {
      unlisten?.();
    };
  }, [queryClient, cfg.event, cfg.queryKey]);

  const installMutation = useMutation({
    mutationFn: cfg.installFn,
  });

  const resetProgress = useCallback(() => setProgress(null), []);

  return { install: installMutation, progress, resetProgress };
}

// Backward-compat re-exports
export { useToolInstallStatus as useClaudeInstallStatus };
export function useInstallClaudeCode() {
  return useInstallTool("claude");
}
