import { strings } from '../strings';

export interface CommandMeta {
  bang: string; // without the leading '!'
  label: string;
  description: string;
}

/**
 * Reserved command bangs, checked before the usual link/search-engine bang
 * flow. Single source of truth for both matching a typed bang and rendering
 * the `!help` listing, so the two can't drift apart.
 */
export const COMMANDS: CommandMeta[] = [
  { bang: 'theme', label: strings.commands.theme.label, description: strings.commands.theme.description },
  { bang: 'help', label: strings.commands.help.label, description: strings.commands.help.description },
];

export function matchCommand(input: string): CommandMeta | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed.startsWith('!')) return null;
  const bang = trimmed.slice(1);
  return COMMANDS.find((c) => c.bang === bang) ?? null;
}
