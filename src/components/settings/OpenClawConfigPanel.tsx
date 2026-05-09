import { useTranslation } from "react-i18next";
import {
  Cpu,
  KeyRound,
  Shield,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AgentsDefaultsPanel from "@/components/openclaw/AgentsDefaultsPanel";
import EnvPanel from "@/components/openclaw/EnvPanel";
import ToolsPanel from "@/components/openclaw/ToolsPanel";

export function OpenClawConfigPanel() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={["model"]} className="space-y-4">
        <AccordionItem value="model" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("openclaw.agents.title")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("openclaw.agents.description")}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50">
            <AgentsDefaultsPanel />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="env" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("openclaw.env.title")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("openclaw.env.description")}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50">
            <EnvPanel />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tools" className="rounded-xl glass-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-base font-semibold">
                  {t("openclaw.tools.title")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("openclaw.tools.description")}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50">
            <ToolsPanel />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
