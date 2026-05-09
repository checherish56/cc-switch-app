import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Key,
  Settings,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import JsonEditor from "@/components/JsonEditor";
import {
  useCodexConfigText,
  useCodexAuth,
  useCodexConfigStatus,
  useSaveCodexConfigText,
  useSaveCodexAuth,
  useUpdateTomlSection,
} from "@/hooks/useCodexConfig";
import { extractErrorMessage } from "@/utils/errorUtils";

export function CodexConfigPanel() {
  const { t } = useTranslation();
  const { data: configText, isLoading: isLoadingConfig } = useCodexConfigText();
  const { data: authData, isLoading: isLoadingAuth } = useCodexAuth();
  const { data: configStatus } = useCodexConfigStatus();
  const saveConfigText = useSaveCodexConfigText();
  const saveAuth = useSaveCodexAuth();
  const updateTomlSection = useUpdateTomlSection();

  const [tomlValue, setTomlValue] = useState("");
  const [authJsonValue, setAuthJsonValue] = useState("{}");
  const [quickModel, setQuickModel] = useState("");
  const [quickBaseUrl, setQuickBaseUrl] = useState("");
  const [isTomlDirty, setIsTomlDirty] = useState(false);
  const [isAuthDirty, setIsAuthDirty] = useState(false);

  useEffect(() => {
    if (configText !== undefined) {
      setTomlValue(configText);
      setIsTomlDirty(false);
    }
  }, [configText]);

  useEffect(() => {
    if (authData !== undefined) {
      setAuthJsonValue(JSON.stringify(authData, null, 2));
      setIsAuthDirty(false);
    }
  }, [authData]);

  const handleSaveToml = async () => {
    try {
      await saveConfigText.mutateAsync(tomlValue);
      toast.success(t("codexConfig.panel.saveSuccess", { defaultValue: "Codex config saved" }));
      setIsTomlDirty(false);
    } catch (error) {
      toast.error(t("codexConfig.panel.saveFailed", { defaultValue: "Save failed" }), {
        description: extractErrorMessage(error) || undefined,
      });
    }
  };

  const handleSaveAuth = async () => {
    try {
      const parsed = JSON.parse(authJsonValue);
      await saveAuth.mutateAsync(parsed);
      toast.success(t("codexConfig.panel.authSaved", { defaultValue: "Auth saved" }));
      setIsAuthDirty(false);
    } catch (error) {
      toast.error(t("codexConfig.panel.authSaveFailed", { defaultValue: "Invalid JSON" }), {
        description: extractErrorMessage(error) || undefined,
      });
    }
  };

  const handleQuickUpdate = useCallback(
    async (field: string, value: string) => {
      try {
        const updated = await updateTomlSection.mutateAsync({ field, value });
        setTomlValue(updated);
        setIsTomlDirty(true);
        toast.success(t("codexConfig.panel.fieldUpdated", { defaultValue: "Field updated" }));
      } catch (error) {
        toast.error(t("codexConfig.panel.updateFailed", { defaultValue: "Update failed" }), {
          description: extractErrorMessage(error) || undefined,
        });
      }
    },
    [t, updateTomlSection],
  );

  const configPath = configStatus?.configPath ?? "~/.codex/config.toml";

  if (isLoadingConfig || isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{configPath}</p>
          {!configStatus?.configExists && (
            <p className="text-xs text-amber-500 mt-1">
              {t("codexConfig.panel.fileNotExists", {
                defaultValue: "File does not exist. It will be created on save.",
              })}
            </p>
          )}
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["configToml"]} className="space-y-4">
        <AccordionItem value="configToml" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("codexConfig.panel.configToml.title", { defaultValue: "config.toml" })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("codexConfig.panel.configToml.description", {
                    defaultValue: "TOML format configuration file",
                  })}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50 space-y-4">
            <Textarea
              value={tomlValue}
              onChange={(e) => {
                setTomlValue(e.target.value);
                setIsTomlDirty(true);
              }}
              placeholder={`model_provider = "openai"
model = "gpt-5-codex"

[model_providers.openai]
name = "OpenAI"
wire_api = "responses"`}
              className="font-mono text-xs min-h-[300px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSaveToml}
                disabled={!isTomlDirty || saveConfigText.isPending}
              >
                {saveConfigText.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t("common.save")}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="authJson" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("codexConfig.panel.authJson.title", { defaultValue: "auth.json" })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("codexConfig.panel.authJson.description", {
                    defaultValue: "Authentication credentials",
                  })}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50 space-y-4">
            <JsonEditor
              value={authJsonValue}
              onChange={(val) => {
                setAuthJsonValue(val);
                setIsAuthDirty(true);
              }}
              height="200px"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSaveAuth}
                disabled={!isAuthDirty || saveAuth.isPending}
              >
                {saveAuth.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t("common.save")}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="quickSettings" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("codexConfig.panel.quickSettings.title", { defaultValue: "Quick Settings" })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("codexConfig.panel.quickSettings.description", {
                    defaultValue: "Commonly edited fields (syntax-preserving TOML edit)",
                  })}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50 space-y-4">
            <div>
              <Label className="mb-2 block text-sm">
                {t("codexConfig.panel.modelName", { defaultValue: "Model Name" })}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={quickModel}
                  onChange={(e) => setQuickModel(e.target.value)}
                  placeholder="gpt-5-codex"
                  className="font-mono text-xs max-w-[300px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickUpdate("model", quickModel)}
                  disabled={updateTomlSection.isPending || !quickModel.trim()}
                >
                  {t("common.apply", { defaultValue: "Apply" })}
                </Button>
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-sm">
                {t("codexConfig.panel.baseUrl", { defaultValue: "Base URL" })}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={quickBaseUrl}
                  onChange={(e) => setQuickBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="font-mono text-xs max-w-[400px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickUpdate("base_url", quickBaseUrl)}
                  disabled={updateTomlSection.isPending || !quickBaseUrl.trim()}
                >
                  {t("common.apply", { defaultValue: "Apply" })}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
