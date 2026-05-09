import { useTranslation } from "react-i18next";
import {
  Brain,
  Cpu,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import HermesMemoryPanel from "@/components/hermes/HermesMemoryPanel";
import { useHermesModelConfig } from "@/hooks/useHermes";
import { useOpenHermesWebUI } from "@/hooks/useHermes";

export function HermesConfigPanel() {
  const { t } = useTranslation();
  const { data: modelConfig, isLoading } = useHermesModelConfig(true);
  const openHermesWebUI = useOpenHermesWebUI(() => {});

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={["model"]} className="space-y-4">
        <AccordionItem value="model" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("hermes.configPanel.modelInfo")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("hermes.configPanel.modelInfoHint")}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {t("hermes.form.primaryModel")}:
                    </span>{" "}
                    <span className="font-mono">
                      {modelConfig?.primaryModel ?? t("openclaw.agents.notSet")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("hermes.form.baseUrl")}:
                    </span>{" "}
                    <span className="font-mono text-xs">
                      {modelConfig?.baseUrl ?? t("openclaw.agents.notSet")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void openHermesWebUI()}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    {t("hermes.configPanel.openWebUi")}
                  </Button>
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="memory" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("hermes.memory.title")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("hermes.configPanel.memoryDescription", {
                    defaultValue: "Manage agent and user memory files",
                  })}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50">
            <HermesMemoryPanel />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
