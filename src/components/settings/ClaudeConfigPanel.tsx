import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Terminal,
  ShieldCheck,
  Globe,
  Settings,
  Info,
  Save,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ToggleRow } from "@/components/ui/toggle-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useClaudeSettings, useSaveClaudeSettings } from "@/hooks/useClaudeConfig";
import { extractErrorMessage } from "@/utils/errorUtils";
import type {
  ClaudeSettingsFile,
  ClaudePermissions,
  ClaudeHookEntry,
  ClaudeHookHandler,
} from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ListItem {
  id: string;
  value: string;
}

interface KvItem {
  id: string;
  key: string;
  value: string;
}

function toListItems(strings?: string[]): ListItem[] {
  return (strings ?? []).map((s) => ({ id: crypto.randomUUID(), value: s }));
}

function fromListItems(items: ListItem[]): string[] {
  return items.map((i) => i.value.trim()).filter(Boolean);
}

function toKvItems(env?: Record<string, string>): KvItem[] {
  if (!env) return [];
  return Object.entries(env).map(([k, v]) => ({
    id: crypto.randomUUID(),
    key: k,
    value: v,
  }));
}

function fromKvItems(items: KvItem[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of items) {
    if (item.key.trim()) {
      result[item.key.trim()] = item.value;
    }
  }
  return result;
}

const HOOK_EVENT_LABEL_KEYS: Record<string, string> = {
  SessionStart: "claudeConfig.hooks.events.SessionStart",
  UserPromptSubmit: "claudeConfig.hooks.events.UserPromptSubmit",
  PreToolUse: "claudeConfig.hooks.events.PreToolUse",
  PermissionRequest: "claudeConfig.hooks.events.PermissionRequest",
  PostToolUse: "claudeConfig.hooks.events.PostToolUse",
  PostToolUseFailure: "claudeConfig.hooks.events.PostToolUseFailure",
  Notification: "claudeConfig.hooks.events.Notification",
  SubagentStart: "claudeConfig.hooks.events.SubagentStart",
  SubagentStop: "claudeConfig.hooks.events.SubagentStop",
  Stop: "claudeConfig.hooks.events.Stop",
  PreCompact: "claudeConfig.hooks.events.PreCompact",
  SessionEnd: "claudeConfig.hooks.events.SessionEnd",
  ConfigChange: "claudeConfig.hooks.events.ConfigChange",
  WorktreeCreate: "claudeConfig.hooks.events.WorktreeCreate",
  WorktreeRemove: "claudeConfig.hooks.events.WorktreeRemove",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClaudeConfigPanel() {
  const { t } = useTranslation();
  const { data, isLoading } = useClaudeSettings();
  const saveMutation = useSaveClaudeSettings();

  const [settings, setSettings] = useState<ClaudeSettingsFile>({});
  const [isDirty, setIsDirty] = useState(false);

  // Permissions
  const [allowList, setAllowList] = useState<ListItem[]>([]);
  const [denyList, setDenyList] = useState<ListItem[]>([]);
  const [askList, setAskList] = useState<ListItem[]>([]);
  const [additionalDirs, setAdditionalDirs] = useState<ListItem[]>([]);

  // Hooks
  const [hooks, setHooks] = useState<Record<string, ClaudeHookEntry[]>>({});

  // Env
  const [envList, setEnvList] = useState<KvItem[]>([]);

  // Sandbox
  const [sandboxEnabled, setSandboxEnabled] = useState(false);
  const [sandboxAutoAllowBash, setSandboxAutoAllowBash] = useState(false);
  const [denyWriteList, setDenyWriteList] = useState<ListItem[]>([]);
  const [denyReadList, setDenyReadList] = useState<ListItem[]>([]);

  // Other
  const [cleanupPeriodDays, setCleanupPeriodDays] = useState<number | undefined>();
  const [showTurnDuration, setShowTurnDuration] = useState(false);
  const [spinnerTipsEnabled, setSpinnerTipsEnabled] = useState(false);
  const [attributionCommit, setAttributionCommit] = useState("");

  // Hydrate local state from fetched data
  useEffect(() => {
    if (!data) return;
    const s = data.settings;
    setSettings(s);

    const perms = s.permissions ?? ({} as ClaudePermissions);
    setAllowList(toListItems(perms.allow));
    setDenyList(toListItems(perms.deny));
    setAskList(toListItems(perms.ask));
    setAdditionalDirs(toListItems(perms.additionalDirectories));

    setHooks(s.hooks ?? {});
    setEnvList(toKvItems(s.env));

    const sb = s.sandbox ?? {};
    setSandboxEnabled(sb.enabled ?? false);
    setSandboxAutoAllowBash(sb.autoAllowBashIfSandboxed ?? false);
    setDenyWriteList(toListItems(sb.filesystem?.denyWrite));
    setDenyReadList(toListItems(sb.filesystem?.denyRead));

    setCleanupPeriodDays(s.cleanupPeriodDays);
    setShowTurnDuration(s.showTurnDuration ?? false);
    setSpinnerTipsEnabled(s.spinnerTipsEnabled ?? false);
    setAttributionCommit(s.attribution?.commit ?? "");

    setIsDirty(false);
  }, [data]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const buildPermissions = (): ClaudePermissions => ({
    defaultMode: settings.permissions?.defaultMode,
    allow: fromListItems(allowList),
    deny: fromListItems(denyList),
    ask: fromListItems(askList),
    additionalDirectories: fromListItems(additionalDirs),
  });

  const buildSettings = (): ClaudeSettingsFile => {
    const perms = buildPermissions();
    const hasPerms =
      perms.defaultMode ||
      perms.allow?.length ||
      perms.deny?.length ||
      perms.ask?.length ||
      perms.additionalDirectories?.length;

    const mergedEnv: Record<string, string> = {
      ...fromKvItems(envList),
    };

    // Preserve managed env keys from original settings
    if (settings.env) {
      for (const mk of data?.managedEnvKeys ?? []) {
        if (settings.env[mk] !== undefined) {
          mergedEnv[mk] = settings.env[mk];
        }
      }
    }

    return {
      ...settings,
      permissions: hasPerms ? perms : undefined,
      hooks: Object.keys(hooks).length > 0 ? hooks : undefined,
      env: Object.keys(mergedEnv).length > 0 ? mergedEnv : undefined,
      sandbox:
        sandboxEnabled || sandboxAutoAllowBash ||
        denyWriteList.length > 0 || denyReadList.length > 0
          ? {
              enabled: sandboxEnabled || undefined,
              autoAllowBashIfSandboxed: sandboxAutoAllowBash || undefined,
              filesystem:
                denyWriteList.length > 0 || denyReadList.length > 0
                  ? {
                      denyWrite: fromListItems(denyWriteList),
                      denyRead: fromListItems(denyReadList),
                    }
                  : undefined,
            }
          : undefined,
      cleanupPeriodDays,
      showTurnDuration: showTurnDuration || undefined,
      spinnerTipsEnabled: spinnerTipsEnabled || undefined,
      attribution: attributionCommit.trim()
        ? { commit: attributionCommit.trim() }
        : undefined,
    };
  };

  const handleSave = async () => {
    try {
      const result = await saveMutation.mutateAsync(buildSettings());
      if (result.backupPath) {
        toast.success(t("claudeConfig.saveSuccess"));
      } else {
        toast.success(t("claudeConfig.saveSuccess"));
      }
      setIsDirty(false);
    } catch (error) {
      const detail = extractErrorMessage(error);
      toast.error(t("claudeConfig.saveFailed"), {
        description: detail || undefined,
      });
    }
  };

  // List editor helpers
  const addListItem = (
    setter: React.Dispatch<React.SetStateAction<ListItem[]>>,
  ) => {
    setter((prev) => [...prev, { id: crypto.randomUUID(), value: "" }]);
    markDirty();
  };

  const updateListItem = (
    setter: React.Dispatch<React.SetStateAction<ListItem[]>>,
    index: number,
    value: string,
  ) => {
    setter((prev) =>
      prev.map((item, i) => (i === index ? { ...item, value } : item)),
    );
    markDirty();
  };

  const removeListItem = (
    setter: React.Dispatch<React.SetStateAction<ListItem[]>>,
    index: number,
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  };

  // Hook editors
  const addHookEvent = (event: string) => {
    setHooks((prev) => ({
      ...prev,
      [event]: [
        ...(prev[event] ?? []),
        { matcher: "", hooks: [{ type: "command", command: "" }] },
      ],
    }));
    markDirty();
  };

  const removeHookEvent = (event: string) => {
    setHooks((prev) => {
      const next = { ...prev };
      delete next[event];
      return next;
    });
    markDirty();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filePath = data?.configPath ?? "~/.claude/settings.json";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{filePath}</p>
          {!data?.exists && (
            <p className="text-xs text-amber-500 mt-1">
              {t("claudeConfig.fileNotExists", {
                defaultValue: "File does not exist. It will be created on save.",
              })}
            </p>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={!isDirty || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t("common.save")}
        </Button>
      </div>

      {/* Managed Keys Info */}
      {(data?.managedEnvKeys?.length || data?.managedTopLevelKeys?.length) && (
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {t("claudeConfig.managedKeys.title", {
              defaultValue: "Some settings are managed by provider switching:",
            })}{" "}
            {data?.managedTopLevelKeys?.length
              ? t("claudeConfig.managedKeys.topLevel", {
                  keys: data.managedTopLevelKeys.join(", "),
                  defaultValue: `Top-level: ${data.managedTopLevelKeys.join(", ")}`,
                })
              : null}
            {data?.managedEnvKeys?.length
              ? t("claudeConfig.managedKeys.envKeys", {
                  keys: data.managedEnvKeys.join(", "),
                  defaultValue: `Env vars: ${data.managedEnvKeys.join(", ")}`,
                })
              : null}
          </AlertDescription>
        </Alert>
      )}

      <Accordion type="multiple" defaultValue={["permissions"]} className="space-y-4">
        {/* ================================================================ */}
        {/* Permissions */}
        {/* ================================================================ */}
        <AccordionItem value="permissions" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("claudeConfig.permissions.title", {
                    defaultValue: "Permissions",
                  })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("claudeConfig.permissions.description", {
                    defaultValue:
                      "Control which tools Claude can use and when to ask for approval",
                  })}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50 space-y-6">
            {/* Permission Mode */}
            <div>
              <Label className="mb-2 block">
                {t("claudeConfig.permissions.defaultMode", {
                  defaultValue: "Default Mode",
                })}
              </Label>
              <Select
                value={settings.permissions?.defaultMode ?? "default"}
                onValueChange={(v) => {
                  setSettings((prev) => ({
                    ...prev,
                    permissions: {
                      ...(prev.permissions ?? {}),
                      defaultMode: v === "default" ? undefined : v,
                    },
                  }));
                  markDirty();
                }}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    {t("claudeConfig.permissions.modeDefault", {
                      defaultValue: "Default (prompt for each tool)",
                    })}
                  </SelectItem>
                  <SelectItem value="acceptEdits">
                    {t("claudeConfig.permissions.modeAcceptEdits", {
                      defaultValue: "Accept Edits (auto-approve edits)",
                    })}
                  </SelectItem>
                  <SelectItem value="bypassPermissions">
                    {t("claudeConfig.permissions.modeBypass", {
                      defaultValue: "Bypass (skip all permission prompts)",
                    })}
                  </SelectItem>
                  <SelectItem value="plan">
                    {t("claudeConfig.permissions.modePlan", {
                      defaultValue: "Plan Mode (read-only)",
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Allow list */}
            <div>
              <Label className="mb-2 block">
                {t("claudeConfig.permissions.allow", { defaultValue: "Allow" })}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("claudeConfig.permissions.allowHint", {
                  defaultValue:
                    'Tools to auto-allow. Use patterns like Bash(npm run *), Read(.env*), Edit(/src/**)',
                })}
              </p>
              <div className="space-y-2">
                {allowList.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      value={item.value}
                      onChange={(e) =>
                        updateListItem(setAllowList, index, e.target.value)
                      }
                      placeholder='e.g., Bash(npm run *), Read'
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeListItem(setAllowList, index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addListItem(setAllowList)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("claudeConfig.permissions.addAllow", {
                    defaultValue: "Add Allowed Tool",
                  })}
                </Button>
              </div>
            </div>

            {/* Deny list */}
            <div>
              <Label className="mb-2 block">
                {t("claudeConfig.permissions.deny", { defaultValue: "Deny" })}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("claudeConfig.permissions.denyHint", {
                  defaultValue:
                    "Tools to always deny. Deny rules take priority over Allow.",
                })}
              </p>
              <div className="space-y-2">
                {denyList.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      value={item.value}
                      onChange={(e) =>
                        updateListItem(setDenyList, index, e.target.value)
                      }
                      placeholder='e.g., Bash(rm -rf *), Bash(curl *)'
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeListItem(setDenyList, index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addListItem(setDenyList)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("claudeConfig.permissions.addDeny", {
                    defaultValue: "Add Denied Tool",
                  })}
                </Button>
              </div>
            </div>

            {/* Ask list */}
            <div>
              <Label className="mb-2 block">
                {t("claudeConfig.permissions.ask", { defaultValue: "Ask" })}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("claudeConfig.permissions.askHint", {
                  defaultValue:
                    "Tools that require explicit user confirmation each time.",
                })}
              </p>
              <div className="space-y-2">
                {askList.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      value={item.value}
                      onChange={(e) =>
                        updateListItem(setAskList, index, e.target.value)
                      }
                      placeholder='e.g., Bash(git push *)'
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeListItem(setAskList, index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addListItem(setAskList)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("claudeConfig.permissions.addAsk", {
                    defaultValue: "Add Ask Rule",
                  })}
                </Button>
              </div>
            </div>

            {/* Additional Directories */}
            <div>
              <Label className="mb-2 block">
                {t("claudeConfig.permissions.additionalDirectories", {
                  defaultValue: "Additional Directories",
                })}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("claudeConfig.permissions.additionalDirsHint", {
                  defaultValue:
                    "Directories Claude can access beyond the project root.",
                })}
              </p>
              <div className="space-y-2">
                {additionalDirs.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      value={item.value}
                      onChange={(e) =>
                        updateListItem(setAdditionalDirs, index, e.target.value)
                      }
                      placeholder="/path/to/directory"
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        removeListItem(setAdditionalDirs, index)
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addListItem(setAdditionalDirs)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("claudeConfig.permissions.addDirectory", {
                    defaultValue: "Add Directory",
                  })}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ================================================================ */}
        {/* Hooks */}
        {/* ================================================================ */}
        <AccordionItem value="hooks" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <Terminal className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("claudeConfig.hooks.title", { defaultValue: "Hooks" })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("claudeConfig.hooks.description", {
                    defaultValue:
                      "Shell commands triggered on Claude Code events like PreToolUse, PostToolUse, etc.",
                  })}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50 space-y-4">
            <p className="text-xs text-muted-foreground">
              {t("claudeConfig.hooks.envHint", {
                defaultValue:
                  "Available env vars: $CLAUDE_FILE_PATH, $CLAUDE_PROJECT_DIR, $ARGUMENTS",
              })}
            </p>

            {Object.keys(hooks).length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("claudeConfig.hooks.noHooks", {
                  defaultValue: "No hooks configured",
                })}
              </p>
            )}

            {Object.entries(hooks).map(([event, entries]) => (
              <div
                key={event}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t(HOOK_EVENT_LABEL_KEYS[event] ?? "", {
                      defaultValue: event,
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeHookEvent(event)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {entries.map((entry, ei) => (
                  <div
                    key={ei}
                    className="border border-border/50 rounded-md p-3 space-y-2 bg-muted/20"
                  >
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-16 flex-shrink-0">
                        {t("claudeConfig.hooks.matcher", {
                          defaultValue: "Matcher",
                        })}
                      </Label>
                      <Input
                        value={entry.matcher ?? ""}
                        onChange={(e) => {
                          const newHooks = { ...hooks };
                          newHooks[event] = [...(newHooks[event] ?? [])];
                          newHooks[event][ei] = {
                            ...newHooks[event][ei],
                            matcher: e.target.value || undefined,
                          };
                          setHooks(newHooks);
                          markDirty();
                        }}
                        placeholder='e.g., Bash, Edit|Write'
                        className="font-mono text-xs h-8"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const newHooks = { ...hooks };
                          newHooks[event] = newHooks[event].filter(
                            (_, i) => i !== ei,
                          );
                          if (newHooks[event].length === 0) {
                            delete newHooks[event];
                          }
                          setHooks(newHooks);
                          markDirty();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {entry.hooks.map((handler, hi) => (
                      <div
                        key={hi}
                        className="flex flex-wrap items-start gap-2 pl-4 border-l-2 border-primary/20"
                      >
                        <Select
                          value={handler.type}
                          onValueChange={(v) => {
                            const newHooks = { ...hooks };
                            const newHandler = {
                              ...newHooks[event][ei].hooks[hi],
                              type: v as ClaudeHookHandler["type"],
                            };
                            newHooks[event][ei].hooks[hi] = newHandler;
                            setHooks(newHooks);
                            markDirty();
                          }}
                        >
                          <SelectTrigger className="w-[110px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="command">command</SelectItem>
                            <SelectItem value="http">http</SelectItem>
                            <SelectItem value="prompt">prompt</SelectItem>
                            <SelectItem value="agent">agent</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          value={
                            handler.command ??
                            handler.url ??
                            handler.prompt ??
                            handler.agent ??
                            ""
                          }
                          onChange={(e) => {
                            const newHooks = { ...hooks };
                            const newHandler = {
                              ...newHooks[event][ei].hooks[hi],
                            };
                            // Clear all value fields, then set the right one
                            delete newHandler.command;
                            delete newHandler.url;
                            delete newHandler.prompt;
                            delete newHandler.agent;
                            const field = handler.type as string;
                            if (field === "command") newHandler.command = e.target.value;
                            else if (field === "http") newHandler.url = e.target.value;
                            else if (field === "prompt") newHandler.prompt = e.target.value;
                            else if (field === "agent") newHandler.agent = e.target.value;
                            newHooks[event][ei].hooks[hi] = newHandler;
                            setHooks(newHooks);
                            markDirty();
                          }}
                          placeholder={
                            handler.type === "command"
                              ? "command to run..."
                              : handler.type === "http"
                                ? "https://..."
                                : handler.type === "prompt"
                                  ? "prompt text..."
                                  : "agent name..."
                          }
                          className="flex-1 min-w-[200px] font-mono text-xs h-8"
                        />

                        <Input
                          value={handler.timeout?.toString() ?? ""}
                          onChange={(e) => {
                            const newHooks = { ...hooks };
                            const newHandler = {
                              ...newHooks[event][ei].hooks[hi],
                            };
                            newHandler.timeout = e.target.value
                              ? Number(e.target.value)
                              : undefined;
                            newHooks[event][ei].hooks[hi] = newHandler;
                            setHooks(newHooks);
                            markDirty();
                          }}
                          placeholder={t("claudeConfig.hooks.timeout", {
                            defaultValue: "timeout (ms)",
                          })}
                          type="number"
                          className="w-[100px] text-xs h-8"
                        />

                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const newHooks = { ...hooks };
                            newHooks[event][ei].hooks = newHooks[event][
                              ei
                            ].hooks.filter((_, i) => i !== hi);
                            if (newHooks[event][ei].hooks.length === 0) {
                              newHooks[event] = newHooks[event].filter(
                                (_, i) => i !== ei,
                              );
                              if (newHooks[event].length === 0) {
                                delete newHooks[event];
                              }
                            }
                            setHooks(newHooks);
                            markDirty();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newHooks = { ...hooks };
                        newHooks[event][ei].hooks = [
                          ...newHooks[event][ei].hooks,
                          { type: "command", command: "" },
                        ];
                        setHooks(newHooks);
                        markDirty();
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t("claudeConfig.hooks.addHandler", {
                        defaultValue: "Add Handler",
                      })}
                    </Button>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newHooks = { ...hooks };
                    newHooks[event] = [
                      ...(newHooks[event] ?? []),
                      {
                        matcher: "",
                        hooks: [{ type: "command", command: "" }],
                      },
                    ];
                    setHooks(newHooks);
                    markDirty();
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t("claudeConfig.hooks.addMatcher", {
                    defaultValue: "Add Matcher Entry",
                  })}
                </Button>
              </div>
            ))}

            {/* Add event button */}
            <Select onValueChange={(v) => addHookEvent(v)}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t("claudeConfig.hooks.addEvent", {
                    defaultValue: "+ Add Hook Event...",
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(HOOK_EVENT_LABEL_KEYS)
                  .filter((e) => !hooks[e])
                  .map((event) => (
                    <SelectItem key={event} value={event}>
                      {t(HOOK_EVENT_LABEL_KEYS[event] ?? "", {
                        defaultValue: event,
                      })}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        {/* ================================================================ */}
        {/* Sandbox */}
        {/* ================================================================ */}
        <AccordionItem value="sandbox" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("claudeConfig.sandbox.title", { defaultValue: "Sandbox" })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("claudeConfig.sandbox.description", {
                    defaultValue:
                      "Security sandbox to isolate Claude Code's file system and network access",
                  })}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50 space-y-4">
            <ToggleRow
              icon={<ShieldCheck className="h-4 w-4" />}
              title={t("claudeConfig.sandbox.enabled", {
                defaultValue: "Enable Sandbox",
              })}
              description={t("claudeConfig.sandbox.enabledHint", {
                defaultValue:
                  "Run commands in an isolated sandbox environment",
              })}
              checked={sandboxEnabled}
              onCheckedChange={(v) => {
                setSandboxEnabled(v);
                markDirty();
              }}
            />

            <ToggleRow
              icon={<ShieldCheck className="h-4 w-4" />}
              title={t("claudeConfig.sandbox.autoAllowBash", {
                defaultValue: "Auto-Allow Bash When Sandboxed",
              })}
              description={t("claudeConfig.sandbox.autoAllowBashHint", {
                defaultValue:
                  "Automatically approve Bash commands when running inside the sandbox",
              })}
              checked={sandboxAutoAllowBash}
              onCheckedChange={(v) => {
                setSandboxAutoAllowBash(v);
                markDirty();
              }}
            />

            {/* Deny Write */}
            <div>
              <Label className="mb-2 block text-sm">
                {t("claudeConfig.sandbox.denyWrite", {
                  defaultValue: "Deny Write Paths",
                })}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("claudeConfig.sandbox.denyWriteHint", {
                  defaultValue:
                    "File paths the sandbox cannot write to",
                })}
              </p>
              <div className="space-y-2">
                {denyWriteList.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      value={item.value}
                      onChange={(e) =>
                        updateListItem(setDenyWriteList, index, e.target.value)
                      }
                      placeholder="~/.claude/settings.json"
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        removeListItem(setDenyWriteList, index)
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addListItem(setDenyWriteList)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("claudeConfig.sandbox.addDenyWrite", {
                    defaultValue: "Add Path",
                  })}
                </Button>
              </div>
            </div>

            {/* Deny Read */}
            <div>
              <Label className="mb-2 block text-sm">
                {t("claudeConfig.sandbox.denyRead", {
                  defaultValue: "Deny Read Paths",
                })}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("claudeConfig.sandbox.denyReadHint", {
                  defaultValue: "File paths the sandbox cannot read",
                })}
              </p>
              <div className="space-y-2">
                {denyReadList.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      value={item.value}
                      onChange={(e) =>
                        updateListItem(setDenyReadList, index, e.target.value)
                      }
                      placeholder="~/.claude/credentials.json"
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        removeListItem(setDenyReadList, index)
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addListItem(setDenyReadList)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("claudeConfig.sandbox.addDenyRead", {
                    defaultValue: "Add Path",
                  })}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ================================================================ */}
        {/* Environment Variables */}
        {/* ================================================================ */}
        <AccordionItem value="env" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("claudeConfig.env.title", {
                    defaultValue: "Environment Variables",
                  })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("claudeConfig.env.description", {
                    defaultValue:
                      "Environment variables passed to Claude Code (provider-managed variables are edited via providers)",
                  })}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50 space-y-3">
            <div className="space-y-2">
              {envList.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    value={item.key}
                    onChange={(e) => {
                      setEnvList((prev) =>
                        prev.map((kv, i) =>
                          i === index ? { ...kv, key: e.target.value } : kv,
                        ),
                      );
                      markDirty();
                    }}
                    placeholder="VAR_NAME"
                    className="font-mono text-xs w-[200px]"
                  />
                  <span className="text-muted-foreground text-sm">=</span>
                  <Input
                    value={item.value}
                    onChange={(e) => {
                      setEnvList((prev) =>
                        prev.map((kv, i) =>
                          i === index ? { ...kv, value: e.target.value } : kv,
                        ),
                      );
                      markDirty();
                    }}
                    placeholder="value"
                    className="font-mono text-xs flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setEnvList((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                      markDirty();
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEnvList((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), key: "", value: "" },
                  ]);
                  markDirty();
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("claudeConfig.env.add", {
                  defaultValue: "Add Variable",
                })}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ================================================================ */}
        {/* Other Settings */}
        {/* ================================================================ */}
        <AccordionItem value="other" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("claudeConfig.other.title", {
                    defaultValue: "Other Settings",
                  })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("claudeConfig.other.description", {
                    defaultValue:
                      "Miscellaneous Claude Code settings",
                  })}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50 space-y-4">
            {/* Model (read-only info) */}
            <div>
              <Label className="mb-2 block text-sm">
                {t("claudeConfig.other.model", { defaultValue: "Model" })}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={settings.model ?? ""}
                  disabled
                  className="font-mono text-xs bg-muted"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {t("claudeConfig.other.modelManaged", {
                    defaultValue: "Managed by provider",
                  })}
                </span>
              </div>
            </div>

            {/* Cleanup Period */}
            <div>
              <Label className="mb-2 block text-sm">
                {t("claudeConfig.other.cleanupPeriodDays", {
                  defaultValue: "Session Cleanup (days)",
                })}
              </Label>
              <Input
                type="number"
                value={cleanupPeriodDays?.toString() ?? ""}
                onChange={(e) => {
                  setCleanupPeriodDays(
                    e.target.value ? Number(e.target.value) : undefined,
                  );
                  markDirty();
                }}
                placeholder="14"
                className="w-[120px] text-xs"
                min={1}
                max={365}
              />
            </div>

            {/* Show Turn Duration */}
            <ToggleRow
              icon={<Settings className="h-4 w-4" />}
              title={t("claudeConfig.other.showTurnDuration", {
                defaultValue: "Show Turn Duration",
              })}
              description={t("claudeConfig.other.showTurnDurationHint", {
                defaultValue:
                  "Display response time for each turn",
              })}
              checked={showTurnDuration}
              onCheckedChange={(v) => {
                setShowTurnDuration(v);
                markDirty();
              }}
            />

            {/* Spinner Tips */}
            <ToggleRow
              icon={<Settings className="h-4 w-4" />}
              title={t("claudeConfig.other.spinnerTipsEnabled", {
                defaultValue: "Show Spinner Tips",
              })}
              description={t("claudeConfig.other.spinnerTipsEnabledHint", {
                defaultValue:
                  "Show tips during the loading spinner",
              })}
              checked={spinnerTipsEnabled}
              onCheckedChange={(v) => {
                setSpinnerTipsEnabled(v);
                markDirty();
              }}
            />

            {/* Attribution */}
            <div>
              <Label className="mb-2 block text-sm">
                {t("claudeConfig.other.attributionCommit", {
                  defaultValue: "Git Attribution (Co-Authored-By)",
                })}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("claudeConfig.other.attributionHint", {
                  defaultValue:
                    "Leave empty to disable Co-Authored-By in commits",
                })}
              </p>
              <Input
                value={attributionCommit}
                onChange={(e) => {
                  setAttributionCommit(e.target.value);
                  markDirty();
                }}
                placeholder="name@example.com"
                className="font-mono text-xs max-w-[300px]"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
