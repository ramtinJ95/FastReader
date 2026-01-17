/**
 * Parse text into an array of words
 * @param text - The input text to parse
 * @returns Array of words
 */
export function parseText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}
