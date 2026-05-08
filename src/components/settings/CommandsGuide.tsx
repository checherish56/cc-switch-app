import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  commandsByCategory,
  searchCommands,
  COMMAND_CATEGORIES,
  type ClaudeSlashCommand,
  type CommandCategory,
} from "@/data/claudeCommands";

export interface CommandsGuideDialogProps {
  open: boolean;
  onClose: () => void;
}

function CommandCard({
  cmd,
  onCopy,
  copied,
}: {
  cmd: ClaudeSlashCommand;
  onCopy: (cmd: ClaudeSlashCommand) => void;
  copied: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/50 p-3.5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <code className="text-sm font-mono font-semibold text-primary whitespace-nowrap">
            {cmd.command}
          </code>
          {cmd.sessionOnly && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {t("commands.sessionOnlyHint")}
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

export function CommandsGuideDialog({ open, onClose }: CommandsGuideDialogProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CommandCategory | "all">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = searchCommands(search);
    if (activeCategory !== "all") {
      list = list.filter((c) => c.category === activeCategory);
    }
    return list;
  }, [search, activeCategory]);

  const grouped = useMemo(() => commandsByCategory(), []);

  const handleCopy = (cmd: ClaudeSlashCommand) => {
    navigator.clipboard.writeText(cmd.command);
    setCopiedId(cmd.id);
    toast.success(t("commands.copied", { cmd: cmd.command }));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sortedCategories = (Object.entries(COMMAND_CATEGORIES) as [CommandCategory, { labelKey: string; order: number }][]).sort(
    ([, a], [, b]) => a.order - b.order,
  );

  const allCount = CLAUDE_SLASH_COMMANDS.length;
  const filteredCount = filtered.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            {t("commands.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("commands.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Search + Category filter */}
        <div className="px-6 py-3 space-y-3 shrink-0">
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
              {t("common.all")} ({allCount})
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
          {search && (
            <p className="text-[11px] text-muted-foreground">
              {filteredCount} / {allCount} {t("common.commands")}
            </p>
          )}
        </div>

        {/* Command list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {activeCategory === "all" && !search ? (
            // Grouped by category
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
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {cmds.length}
                      </Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {cmds.map((cmd) => (
                        <CommandCard
                          key={cmd.id}
                          cmd={cmd}
                          onCopy={handleCopy}
                          copied={copiedId === cmd.id}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Flat filtered list
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map((cmd) => (
                <CommandCard
                  key={cmd.id}
                  cmd={cmd}
                  onCopy={handleCopy}
                  copied={copiedId === cmd.id}
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
      </DialogContent>
    </Dialog>
  );
}
