import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { codexConfigApi } from "@/lib/api/codexConfig";

export const codexConfigKeys = {
  all: ["codexConfig"] as const,
  configText: () => [...codexConfigKeys.all, "configText"] as const,
  auth: () => [...codexConfigKeys.all, "auth"] as const,
  status: () => [...codexConfigKeys.all, "status"] as const,
};

export function useCodexConfigText() {
  return useQuery({
    queryKey: codexConfigKeys.configText(),
    queryFn: () => codexConfigApi.getConfigText(),
    staleTime: 30_000,
  });
}

export function useCodexAuth() {
  return useQuery({
    queryKey: codexConfigKeys.auth(),
    queryFn: () => codexConfigApi.readAuthJson(),
    staleTime: 30_000,
  });
}

export function useCodexConfigStatus() {
  return useQuery({
    queryKey: codexConfigKeys.status(),
    queryFn: () => codexConfigApi.getConfigStatus(),
    staleTime: 30_000,
  });
}

export function useSaveCodexConfigText() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (configText: string) => codexConfigApi.setConfigText(configText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: codexConfigKeys.configText() });
    },
  });
}

export function useSaveCodexAuth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auth: Record<string, unknown>) => codexConfigApi.setAuthJson(auth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: codexConfigKeys.auth() });
    },
  });
}

export function useUpdateTomlSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ field, value }: { field: string; value: string }) =>
      codexConfigApi.updateTomlSection(field, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: codexConfigKeys.configText() });
    },
  });
}
