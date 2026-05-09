export type CommandCategory =
  | "session"
  | "config"
  | "tools"
  | "account"
  | "dev"
  | "navigation";

export interface AgentSlashCommand {
  id: string;
  command: string;
  category: CommandCategory;
  descriptionKey: string;
  usageKey: string;
  sessionOnly: boolean;
  hasCliEquivalent: boolean;
  cliFlag?: string;
  agent: "claude" | "codex" | "opencode" | "openclaw" | "hermes";
}
