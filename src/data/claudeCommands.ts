export type CommandCategory =
  | "session"
  | "config"
  | "tools"
  | "account"
  | "dev"
  | "navigation";

export interface ClaudeSlashCommand {
  id: string;
  command: string;
  category: CommandCategory;
  descriptionKey: string;
  usageKey: string;
  sessionOnly: boolean;
  hasCliEquivalent: boolean;
  cliFlag?: string;
}

const CMD = (id: string, overrides?: Partial<ClaudeSlashCommand>): ClaudeSlashCommand => ({
  id,
  command: `/${id}`,
  category: "session" as const,
  descriptionKey: `commands.${id}.description`,
  usageKey: `commands.${id}.usage`,
  sessionOnly: true,
  hasCliEquivalent: false,
  ...overrides,
});

export const COMMAND_CATEGORIES: Record<CommandCategory, { labelKey: string; order: number }> = {
  session:  { labelKey: "commands.categories.session",  order: 0 },
  config:   { labelKey: "commands.categories.config",   order: 1 },
  tools:    { labelKey: "commands.categories.tools",    order: 2 },
  navigation: { labelKey: "commands.categories.navigation", order: 3 },
  dev:      { labelKey: "commands.categories.dev",      order: 4 },
  account:  { labelKey: "commands.categories.account",  order: 5 },
};

export const CLAUDE_SLASH_COMMANDS: ClaudeSlashCommand[] = [
  // ── Session ──
  CMD("help",   { sessionOnly: false }),
  CMD("clear",  { descriptionKey: "commands.clear.description" }),
  CMD("compact"),
  CMD("cost",   { sessionOnly: false, descriptionKey: "commands.cost.description" }),
  CMD("status"),
  CMD("context"),
  CMD("bashes"),
  CMD("todos"),
  CMD("resume", { sessionOnly: false }),
  CMD("rename"),
  CMD("export"),

  // ── Configuration ──
  CMD("config",     { category: "config", sessionOnly: false }),
  CMD("init",       { category: "config", sessionOnly: false }),
  CMD("model",      { category: "config", hasCliEquivalent: true, cliFlag: "--model" }),
  CMD("effort",     { category: "config", hasCliEquivalent: true, cliFlag: "--effort" }),
  CMD("output-style", { id: "output-style", command: "/output-style", category: "config", descriptionKey: "commands.outputStyle.description", usageKey: "commands.outputStyle.usage", sessionOnly: false, hasCliEquivalent: true }),
  CMD("permissions",  { category: "config", hasCliEquivalent: true, cliFlag: "--permission-mode" }),
  CMD("approved-tools", { id: "approved-tools", command: "/approved-tools", category: "config", descriptionKey: "commands.approvedTools.description", usageKey: "commands.approvedTools.usage", sessionOnly: false, hasCliEquivalent: true, cliFlag: "--allowedTools" }),
  CMD("add-dir",    { id: "add-dir", command: "/add-dir", category: "config", descriptionKey: "commands.addDir.description", usageKey: "commands.addDir.usage", hasCliEquivalent: true, cliFlag: "--add-dir" }),
  CMD("ide",        { category: "config", sessionOnly: false }),
  CMD("theme",      { category: "config", sessionOnly: false }),
  CMD("terminal-setup", { id: "terminal-setup", command: "/terminal-setup", category: "config", descriptionKey: "commands.terminalSetup.description", usageKey: "commands.terminalSetup.usage", sessionOnly: false }),

  // ── Tools ──
  CMD("agents",    { category: "tools", sessionOnly: false }),
  CMD("memory",    { category: "tools", sessionOnly: false }),
  CMD("review",    { category: "tools" }),
  CMD("security-review", { id: "security-review", command: "/security-review", category: "tools", descriptionKey: "commands.securityReview.description", usageKey: "commands.securityReview.usage" }),
  CMD("simplify",  { category: "tools" }),
  CMD("pr-comments", { id: "pr-comments", command: "/pr-comments", category: "tools", descriptionKey: "commands.prComments.description", usageKey: "commands.prComments.usage" }),

  // ── Navigation ──
  CMD("doctor",    { category: "navigation", sessionOnly: false }),
  CMD("upgrade",   { category: "navigation", sessionOnly: false }),
  CMD("release-notes", { id: "release-notes", command: "/release-notes", category: "navigation", descriptionKey: "commands.releaseNotes.description", usageKey: "commands.releaseNotes.usage", sessionOnly: false }),

  // ── Account ──
  CMD("login",  { category: "account", sessionOnly: false }),
  CMD("logout", { category: "account" }),
  CMD("stats",  { category: "account", sessionOnly: false }),

  // ── Development ──
  CMD("test", { category: "dev", descriptionKey: "commands.test.description", usageKey: "commands.test.usage", sessionOnly: false }),
];

export function commandsByCategory(): Map<CommandCategory, ClaudeSlashCommand[]> {
  const map = new Map<CommandCategory, ClaudeSlashCommand[]>();
  for (const cmd of CLAUDE_SLASH_COMMANDS) {
    const list = map.get(cmd.category) ?? [];
    list.push(cmd);
    map.set(cmd.category, list);
  }
  return map;
}

export function searchCommands(query: string): ClaudeSlashCommand[] {
  const q = query.toLowerCase().trim();
  if (!q) return CLAUDE_SLASH_COMMANDS;
  return CLAUDE_SLASH_COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q),
  );
}
