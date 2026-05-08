import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Rocket, Settings2, X } from "lucide-react";
import type { ClaudeLaunchConfig } from "@/lib/api/settings";
import { settingsApi } from "@/lib/api";

export interface ClaudeLaunchConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onLaunch: (config: ClaudeLaunchConfig) => void;
  cwd?: string;
}

const EFFORT_OPTIONS = ["low", "medium", "high", "max"] as const;
const PERMISSION_MODE_OPTIONS = [
  "default",
  "acceptEdits",
  "bypassPermissions",
  "plan",
] as const;
const OUTPUT_FORMAT_OPTIONS = ["text", "json", "stream-json"] as const;

const fieldSpacing = "space-y-2";
const inputClass = "h-9 text-sm";
const labelClass = "text-xs font-medium";
const selectClass = "text-sm";

export function ClaudeLaunchConfigDialog({
  open,
  onClose,
  onLaunch,
  cwd,
}: ClaudeLaunchConfigDialogProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ClaudeLaunchConfig>({});
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    settingsApi.getClaudeDefaultLaunchConfig().then((def) => {
      if (def) setConfig(def);
    });
  }, [open]);

  const update = (patch: Partial<ClaudeLaunchConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleLaunch = async () => {
    if (saveAsDefault) {
      await settingsApi.setClaudeDefaultLaunchConfig(config);
    }
    onLaunch(config);
  };

  const handleAddDir = () => {
    settingsApi.pickDirectory().then((dir) => {
      if (!dir) return;
      const dirs = config.addDirs ?? [];
      if (!dirs.includes(dir)) {
        update({ addDirs: [...dirs, dir] });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="px-7 py-5">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <Settings2 className="h-5 w-5 text-primary" />
            {t("claudeLaunch.title")}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {t("claudeLaunch.description")}
            {cwd && (
              <span className="block mt-1.5 text-[11px] font-mono text-muted-foreground truncate bg-muted/50 rounded-md px-2.5 py-1.5">
                {cwd}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-7 py-5">
          {/* ── Model ── */}
          <div className={fieldSpacing}>
            <Label className={labelClass}>{t("claudeLaunch.model")}</Label>
            <Input
              className={inputClass}
              placeholder="claude-sonnet-4-6"
              value={config.model ?? ""}
              onChange={(e) => update({ model: e.target.value || undefined })}
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t("claudeLaunch.modelHint")}
            </p>
          </div>

          {/* ── Effort + Permission Mode ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className={fieldSpacing}>
              <Label className={labelClass}>{t("claudeLaunch.effort")}</Label>
              <Select
                value={config.effort ?? ""}
                onValueChange={(v) => update({ effort: v || undefined })}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={t("claudeLaunch.effortPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {EFFORT_OPTIONS.map((e) => (
                    <SelectItem key={e} value={e} className={selectClass}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t("claudeLaunch.effortHint")}
              </p>
            </div>
            <div className={fieldSpacing}>
              <Label className={labelClass}>{t("claudeLaunch.permissionMode")}</Label>
              <Select
                value={config.permissionMode ?? ""}
                onValueChange={(v) => update({ permissionMode: v || undefined })}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={t("claudeLaunch.permissionModePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {PERMISSION_MODE_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m} className={selectClass}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t("claudeLaunch.permissionModeHint")}
              </p>
            </div>
          </div>

          {/* ── Output Format + Max Turns ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className={fieldSpacing}>
              <Label className={labelClass}>{t("claudeLaunch.outputFormat")}</Label>
              <Select
                value={config.outputFormat ?? ""}
                onValueChange={(v) => update({ outputFormat: v || undefined })}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={t("claudeLaunch.outputFormatPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_FORMAT_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f} className={selectClass}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t("claudeLaunch.outputFormatHint")}
              </p>
            </div>
            <div className={fieldSpacing}>
              <Label className={labelClass}>{t("claudeLaunch.maxTurns")}</Label>
              <Input
                className={inputClass}
                type="number"
                min="1"
                placeholder="50"
                value={config.maxTurns ?? ""}
                onChange={(e) =>
                  update({
                    maxTurns: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t("claudeLaunch.maxTurnsHint")}
              </p>
            </div>
          </div>

          {/* ── Toggles ── */}
          <div className="space-y-3 rounded-lg bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label className={labelClass}>{t("claudeLaunch.verbose")}</Label>
                <p className="text-[11px] text-muted-foreground">
                  {t("claudeLaunch.verboseHint")}
                </p>
              </div>
              <Switch
                checked={config.verbose ?? false}
                onCheckedChange={(v) => update({ verbose: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label className={labelClass}>{t("claudeLaunch.dangerouslySkipPermissions")}</Label>
                <p className="text-[11px] text-muted-foreground">
                  {t("claudeLaunch.dangerouslySkipPermissionsHint")}
                </p>
              </div>
              <Switch
                checked={config.dangerouslySkipPermissions ?? false}
                onCheckedChange={(v) => update({ dangerouslySkipPermissions: v })}
              />
            </div>
          </div>

          {/* ── Advanced toggle ── */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground -ml-2 gap-1.5"
            onClick={() => setAdvancedOpen(!advancedOpen)}
          >
            <span className="text-[11px]">{advancedOpen ? "▾" : "▸"}</span>
            {t(advancedOpen ? "claudeLaunch.hideAdvanced" : "claudeLaunch.showAdvanced")}
          </Button>

          {advancedOpen && (
            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
              {/* Add dirs */}
              <div className={fieldSpacing}>
                <Label className={labelClass}>{t("claudeLaunch.addDirs")}</Label>
                {(config.addDirs ?? []).length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {(config.addDirs ?? []).map((dir, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[11px] font-mono bg-background rounded-md border border-border/40 px-2.5 py-1.5"
                      >
                        <span className="flex-1 truncate text-muted-foreground">{dir}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() =>
                            update({
                              addDirs: (config.addDirs ?? []).filter((_, j) => j !== i),
                            })
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleAddDir}
                >
                  + {t("claudeLaunch.addDirButton")}
                </Button>
              </div>

              {/* Allowed tools */}
              <div className={fieldSpacing}>
                <Label className={labelClass}>{t("claudeLaunch.allowedTools")}</Label>
                <Input
                  className={inputClass}
                  placeholder="Bash, Read, Edit"
                  value={(config.allowedTools ?? []).join(", ")}
                  onChange={(e) =>
                    update({
                      allowedTools: e.target.value
                        ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        : [],
                    })
                  }
                />
              </div>

              {/* Disallowed tools */}
              <div className={fieldSpacing}>
                <Label className={labelClass}>{t("claudeLaunch.disallowedTools")}</Label>
                <Input
                  className={inputClass}
                  placeholder="Bash"
                  value={(config.disallowedTools ?? []).join(", ")}
                  onChange={(e) =>
                    update({
                      disallowedTools: e.target.value
                        ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        : [],
                    })
                  }
                />
              </div>

              {/* System prompt */}
              <div className={fieldSpacing}>
                <Label className={labelClass}>{t("claudeLaunch.systemPrompt")}</Label>
                <Textarea
                  className="text-sm min-h-[70px] resize-y"
                  placeholder={t("claudeLaunch.systemPromptPlaceholder")}
                  value={config.systemPrompt ?? ""}
                  onChange={(e) => update({ systemPrompt: e.target.value || undefined })}
                />
              </div>

              {/* Append system prompt */}
              <div className={fieldSpacing}>
                <Label className={labelClass}>{t("claudeLaunch.appendSystemPrompt")}</Label>
                <Textarea
                  className="text-sm min-h-[70px] resize-y"
                  placeholder={t("claudeLaunch.appendSystemPromptPlaceholder")}
                  value={config.appendSystemPrompt ?? ""}
                  onChange={(e) => update({ appendSystemPrompt: e.target.value || undefined })}
                />
              </div>

              {/* Extra args */}
              <div className={fieldSpacing}>
                <Label className={labelClass}>{t("claudeLaunch.extraArgs")}</Label>
                <Input
                  className={inputClass}
                  placeholder="--some-flag --another-flag"
                  value={config.extraArgs ?? ""}
                  onChange={(e) => update({ extraArgs: e.target.value || undefined })}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-7 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="save-default"
              checked={saveAsDefault}
              onCheckedChange={(v) => setSaveAsDefault(!!v)}
            />
            <label
              htmlFor="save-default"
              className="text-xs text-muted-foreground cursor-pointer select-none leading-none"
            >
              {t("claudeLaunch.saveAsDefault")}
            </label>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-sm"
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              className="h-9 text-sm gap-2 px-5"
              onClick={handleLaunch}
            >
              <Rocket className="h-4 w-4" />
              {t("claudeLaunch.launch")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
