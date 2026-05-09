import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Copy,
  CopyCheck,
  BookOpen,
  Clock,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import {
  CLAUDE_SLASH_COMMANDS,
  COMMAND_CATEGORIES,
  type CommandCategory,
} from "@/data/claudeCommands";
import {
  CODEX_SLASH_COMMANDS,
} from "@/data/codexCommands";
import {
  OPENCODE_SLASH_COMMANDS,
} from "@/data/opencodeCommands";
import {
  OPENCLAW_SLASH_COMMANDS,
} from "@/data/openclawCommands";
import {
  HERMES_SLASH_COMMANDS,
} from "@/data/hermesCommands";
import type { AgentSlashCommand } from "@/data/agentCommands";

type AgentId = "all" | "claude" | "codex" | "opencode" | "openclaw" | "hermes";

const AGENT_META: Record<
  Exclude<AgentId, "all">,
  { label: string; colorClass: string }
> = {
  claude: {
    label: "Claude Code",
    colorClass:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  codex: {
    label: "Codex",
    colorClass:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  opencode: {
    label: "OpenCode",
    colorClass:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  openclaw: {
    label: "OpenClaw",
    colorClass:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  hermes: {
    label: "Hermes",
    colorClass:
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
};

const ALL_COMMANDS: Record<Exclude<AgentId, "all">, AgentSlashCommand[]> = {
  claude: CLAUDE_SLASH_COMMANDS as AgentSlashCommand[],
  codex: CODEX_SLASH_COMMANDS,
  opencode: OPENCODE_SLASH_COMMANDS,
  openclaw: OPENCLAW_SLASH_COMMANDS,
  hermes: HERMES_SLASH_COMMANDS,
};

function CommandCard({
  cmd,
  onCopy,
  copied,
  showAgent,
}: {
  cmd: AgentSlashCommand;
  onCopy: (cmd: AgentSlashCommand) => void;
  copied: boolean;
  showAgent?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/50 p-3.5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <code className="text-sm font-mono font-semibold text-primary whitespace-nowrap">
            {cmd.command}
          </code>
          {showAgent && AGENT_META[cmd.agent] && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full border ${AGENT_META[cmd.agent].colorClass}`}
            >
              {AGENT_META[cmd.agent].label}
            </span>
          )}
          {cmd.sessionOnly && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {t(`commands.${cmd.agent}.sessionOnlyHint`)}
            </span>
          )}
          {cmd.hasCliEquivalent && cmd.cliFlag && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {t("commands.cliHint", { flag: cmd.cliFlag })}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => onCopy(cmd)}
        >
          {copied ? (
            <CopyCheck className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(cmd.descriptionKey)}
      </p>
      <p className="text-[11px] text-muted-foreground/60 font-mono truncate">
        {t(cmd.usageKey)}
      </p>
    </div>
  );
}

export function CommandsGuidePage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CommandCategory | "all">(
    "all",
  );
  const [activeAgent, setActiveAgent] = useState<AgentId>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list: AgentSlashCommand[];

    if (activeAgent === "all") {
      list = Object.values(ALL_COMMANDS).flat();
    } else {
      list = ALL_COMMANDS[activeAgent] ?? [];
    }

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (c) =>
          c.command.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          t(c.descriptionKey).toLowerCase().includes(q),
      );
    }

    if (activeCategory !== "all") {
      list = list.filter((c) => c.category === activeCategory);
    }

    return list;
  }, [search, activeCategory, activeAgent, t]);

  const grouped = useMemo(() => {
    const map = new Map<CommandCategory, AgentSlashCommand[]>();
    const source =
      activeAgent === "all"
        ? Object.values(ALL_COMMANDS).flat()
        : (ALL_COMMANDS[activeAgent] ?? []);
    for (const cmd of source) {
      const list = map.get(cmd.category) ?? [];
      list.push(cmd);
      map.set(cmd.category, list);
    }
    return map;
  }, [activeAgent]);

  const handleCopy = (cmd: AgentSlashCommand) => {
    navigator.clipboard.writeText(cmd.command);
    setCopiedId(cmd.id + cmd.agent);
    toast.success(t("commands.copied", { cmd: cmd.command }));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sortedCategories = (
    Object.entries(COMMAND_CATEGORIES) as [
      CommandCategory,
      { labelKey: string; order: number },
    ][]
  ).sort(([, a], [, b]) => a.order - b.order);

  const allCount = Object.values(ALL_COMMANDS).flat().length;
  const filteredCount = filtered.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">
            {t("commands.title")}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("commands.multiAgentDescription", {
            defaultValue:
              "Slash command reference for all AI coding agents. Click to copy for use in terminal sessions.",
          })}
        </p>
      </div>

      {/* Agent selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant={activeAgent === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveAgent("all")}
          >
            {t("common.all")} ({allCount})
          </Button>
          {(
            Object.entries(AGENT_META) as [
              Exclude<AgentId, "all">,
              { label: string; colorClass: string },
            ][]
          ).map(([id, meta]) => {
            const count = ALL_COMMANDS[id].length;
            return (
              <Button
                key={id}
                variant={activeAgent === id ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveAgent(id)}
              >
                {meta.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Search + Category filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-9 pl-9 text-sm"
              placeholder={t("commands.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveCategory("all")}
            >
              {t("common.all")}
            </Button>
            {sortedCategories.map(([cat, meta]) => {
              const count = (grouped.get(cat) ?? []).length;
              return (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setActiveCategory(cat)}
                >
                  {t(meta.labelKey)} ({count})
                </Button>
              );
            })}
          </div>
        </div>
        {search && (
          <p className="text-[11px] text-muted-foreground">
            {filteredCount} / {allCount} {t("common.commands")}
          </p>
        )}
      </div>

      {/* Command list */}
      <div>
        {activeCategory === "all" && !search ? (
          <div className="space-y-6">
            {sortedCategories.map(([cat, meta]) => {
              const cmds = grouped.get(cat);
              if (!cmds?.length) return null;
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="text-sm font-medium">
                      {t(meta.labelKey)}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-4 px-1.5"
                    >
                      {cmds.length}
                    </Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {cmds.map((cmd) => (
                      <CommandCard
                        key={cmd.id + cmd.agent}
                        cmd={cmd}
                        onCopy={handleCopy}
                        copied={copiedId === cmd.id + cmd.agent}
                        showAgent={activeAgent === "all"}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((cmd) => (
              <CommandCard
                key={cmd.id + cmd.agent}
                cmd={cmd}
                onCopy={handleCopy}
                copied={copiedId === cmd.id + cmd.agent}
                showAgent={activeAgent === "all"}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                {t("common.noResults")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
