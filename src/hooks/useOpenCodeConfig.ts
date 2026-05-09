import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opencodeConfigApi } from "@/lib/api/opencodeConfig";

export const opencodeConfigKeys = {
  all: ["opencodeConfig"] as const,
  config: () => [...opencodeConfigKeys.all, "config"] as const,
  status: () => [...opencodeConfigKeys.all, "status"] as const,
};

export function useOpenCodeConfig() {
  return useQuery({
    queryKey: opencodeConfigKeys.config(),
    queryFn: () => opencodeConfigApi.getConfig(),
    staleTime: 30_000,
  });
}

export function useOpenCodeConfigStatus() {
  return useQuery({
    queryKey: opencodeConfigKeys.status(),
    queryFn: () => opencodeConfigApi.getConfigStatus(),
    staleTime: 30_000,
  });
}

export function useSaveOpenCodeConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Record<string, unknown>) =>
      opencodeConfigApi.setConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: opencodeConfigKeys.config() });
    },
  });
}
