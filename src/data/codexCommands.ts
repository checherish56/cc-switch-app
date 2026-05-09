import type { AgentSlashCommand, CommandCategory } from "./agentCommands";

const CMD = (
  id: string,
  overrides?: Partial<AgentSlashCommand>,
): AgentSlashCommand => ({
  id,
  command: `/${id}`,
  category: "session" as const,
  descriptionKey: `commands.codex.${id}.description`,
  usageKey: `commands.codex.${id}.usage`,
  sessionOnly: true,
  hasCliEquivalent: false,
  ...overrides,
  agent: "codex",
});

export const CODEX_COMMAND_CATEGORIES: Record<
  CommandCategory,
  { labelKey: string; order: number }
> = {
  session: { labelKey: "commands.categories.session", order: 0 },
  config: { labelKey: "commands.categories.config", order: 1 },
  tools: { labelKey: "commands.categories.tools", order: 2 },
  navigation: { labelKey: "commands.categories.navigation", order: 3 },
  account: { labelKey: "commands.categories.account", order: 4 },
  dev: { labelKey: "commands.categories.dev", order: 5 },
};

export const CODEX_SLASH_COMMANDS: AgentSlashCommand[] = [
  // Session
  CMD("help", { sessionOnly: false }),
  CMD("clear"),
  CMD("compact"),
  CMD("cost", { sessionOnly: false }),
  CMD("status"),
  CMD("context"),
  CMD("bashes"),
  CMD("todos"),
  CMD("resume", { sessionOnly: false }),
  CMD("rename"),
  CMD("export"),

  // Configuration
  CMD("config", { category: "config", sessionOnly: false }),
  CMD("init", { category: "config", sessionOnly: false }),
  CMD("model", {
    category: "config",
    hasCliEquivalent: true,
    cliFlag: "--model",
  }),
  CMD("permissions", {
    category: "config",
    hasCliEquivalent: true,
    cliFlag: "--permission-mode",
  }),
  CMD("add-dir", {
    id: "add-dir",
    command: "/add-dir",
    category: "config",
    hasCliEquivalent: true,
    cliFlag: "--add-dir",
  }),
  CMD("ide", { category: "config", sessionOnly: false }),
  CMD("theme", { category: "config", sessionOnly: false }),
  CMD("terminal-setup", {
    id: "terminal-setup",
    command: "/terminal-setup",
    category: "config",
    sessionOnly: false,
  }),

  // Tools
  CMD("agents", { category: "tools", sessionOnly: false }),
  CMD("memory", { category: "tools", sessionOnly: false }),
  CMD("review", { category: "tools" }),
  CMD("security-review", {
    id: "security-review",
    command: "/security-review",
    category: "tools",
  }),
  CMD("simplify", { category: "tools" }),
  CMD("pr-comments", {
    id: "pr-comments",
    command: "/pr-comments",
    category: "tools",
  }),

  // Navigation
  CMD("doctor", { category: "navigation", sessionOnly: false }),
  CMD("upgrade", { category: "navigation", sessionOnly: false }),
  CMD("release-notes", {
    id: "release-notes",
    command: "/release-notes",
    category: "navigation",
    sessionOnly: false,
  }),

  // Account
  CMD("login", { category: "account", sessionOnly: false }),
  CMD("logout", { category: "account" }),
  CMD("stats", { category: "account", sessionOnly: false }),

  // Dev
  CMD("test", { category: "dev", sessionOnly: false }),
];

export function codexCommandsByCategory(): Map<
  CommandCategory,
  AgentSlashCommand[]
> {
  const map = new Map<CommandCategory, AgentSlashCommand[]>();
  for (const cmd of CODEX_SLASH_COMMANDS) {
    const list = map.get(cmd.category) ?? [];
    list.push(cmd);
    map.set(cmd.category, list);
  }
  return map;
}
