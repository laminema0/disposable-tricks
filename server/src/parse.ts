// Find the JSON object in a provider's answer. Models like to wrap it in a code
// fence or a sentence, so we look for the outermost pair of braces when plain parsing fails.

export function extractJson(text: unknown): Record<string, unknown> | undefined {
  if (typeof text !== 'string') return undefined;
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  for (const candidate of [text, first >= 0 && last > first ? text.slice(first, last + 1) : '']) {
    if (!candidate) continue;
    try {
      const value: unknown = JSON.parse(candidate);
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}
