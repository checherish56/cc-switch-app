import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Server,
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
import JsonEditor from "@/components/JsonEditor";
import {
  useOpenCodeConfig,
  useOpenCodeConfigStatus,
  useSaveOpenCodeConfig,
} from "@/hooks/useOpenCodeConfig";
import { extractErrorMessage } from "@/utils/errorUtils";

export function OpenCodeConfigPanel() {
  const { t } = useTranslation();
  const { data: config, isLoading } = useOpenCodeConfig();
  const { data: configStatus } = useOpenCodeConfigStatus();
  const saveConfig = useSaveOpenCodeConfig();

  const [editorValue, setEditorValue] = useState("{}");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (config !== undefined) {
      setEditorValue(JSON.stringify(config, null, 2));
      setIsDirty(false);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(editorValue);
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        toast.error(
          t("opencodeConfig.panel.mustBeObject", {
            defaultValue: "Configuration must be a JSON object",
          }),
        );
        return;
      }
      await saveConfig.mutateAsync(parsed);
      toast.success(
        t("opencodeConfig.panel.saveSuccess", {
          defaultValue: "OpenCode config saved",
        }),
      );
      setIsDirty(false);
    } catch (error) {
      toast.error(
        t("opencodeConfig.panel.saveFailed", { defaultValue: "Save failed" }),
        { description: extractErrorMessage(error) || undefined },
      );
    }
  };

  const configPath =
    configStatus?.configPath ?? "~/.config/opencode/opencode.json";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Extract providers list for read-only display
  const providers: Record<string, unknown> =
    (config && typeof config === "object" && !Array.isArray(config)
      ? (config as Record<string, unknown>).provider
      : undefined) as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-mono">
            {configPath}
          </p>
          {!configStatus?.exists && (
            <p className="text-xs text-amber-500 mt-1">
              {t("opencodeConfig.panel.fileNotExists", {
                defaultValue:
                  "File does not exist. It will be created on save.",
              })}
            </p>
          )}
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={["configFile"]}
        className="space-y-4"
      >
        <AccordionItem
          value="configFile"
          className="rounded-xl glass-card overflow-hidden"
        >
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("opencodeConfig.panel.configFile.title", {
                    defaultValue: "opencode.json",
                  })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("opencodeConfig.panel.configFile.description", {
                    defaultValue: "JSON format configuration file",
                  })}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50 space-y-4">
            <JsonEditor
              value={editorValue}
              onChange={(val) => {
                setEditorValue(val);
                setIsDirty(true);
              }}
              height="400px"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!isDirty || saveConfig.isPending}
              >
                {saveConfig.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t("common.save")}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {providers && Object.keys(providers).length > 0 && (
          <AccordionItem
            value="providers"
            className="rounded-xl glass-card overflow-hidden"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <h3 className="text-base font-semibold">
                    {t("opencodeConfig.panel.providersList.title", {
                      defaultValue: "Configured Providers",
                    })}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t("opencodeConfig.panel.providersList.description", {
                      defaultValue: "Providers in this config (read-only)",
                    })}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50">
              <div className="space-y-2">
                {Object.entries(providers).map(([id, provider]) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-2.5"
                  >
                    <span className="text-sm font-mono font-medium">{id}</span>
                    <span className="text-xs text-muted-foreground">
                      {typeof provider === "object" && provider !== null
                        ? (provider as Record<string, unknown>).base_url as string ?? ""
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
