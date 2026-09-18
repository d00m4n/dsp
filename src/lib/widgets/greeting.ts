export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/** Morning 05:00-11:59, afternoon 12:00-19:59, evening 20:00-22:59, night 23:00-04:59. */
export function partOfDay(hour: number): PartOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 20) return 'afternoon';
  if (hour >= 20 && hour < 23) return 'evening';
  return 'night';
}

/**
 * Substitutes '{name}' as plain text (never HTML). With an empty name, the
 * placeholder and its surrounding connector punctuation/space are removed
 * instead of leaving a double space or a dangling comma.
 */
export function fillGreetingTemplate(template: string, name: string): string {
  if (name.trim() === '') {
    return template
      .replace(/\s*,\s*\{name\}/g, '')
      .replace(/\{name\}\s*,\s*/g, '')
      .replace(/\{name\}/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  return template.replaceAll('{name}', name);
}
