import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claudeConfigApi } from "@/lib/api/claudeConfig";
import type { ClaudeSettingsFile } from "@/types";

export const claudeConfigKeys = {
  all: ["claudeConfig"] as const,
  settings: () => ["claudeConfig", "settings"] as const,
};

export function useClaudeSettings() {
  return useQuery({
    queryKey: claudeConfigKeys.settings(),
    queryFn: () => claudeConfigApi.getSettings(),
    staleTime: 30_000,
  });
}

export function useSaveClaudeSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: ClaudeSettingsFile) =>
      claudeConfigApi.setSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claudeConfigKeys.settings() });
    },
  });
}
