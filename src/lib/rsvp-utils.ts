import type { WordParts } from '../types';

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

// Pre-compiled regex for performance
const unicodeLetterRegex = /\p{L}/u;

/**
 * Calculate the ORP (Optimal Recognition Point) index based on word length.
 * The ORP is where the eye naturally focuses when reading.
 *
 * @param word - The word to calculate ORP for
 * @returns The index of the letter that should be highlighted (0-based)
 */
export function getORPIndex(word: string): number {
  if (!word || typeof word !== 'string') return 0;

  // Count only letters (Unicode-aware)
  const len = word.replace(/[^\p{L}]/gu, '').length;

  if (len <= 1) return 0;
  if (len <= 3) return 0; // 1-3 letters: 1st letter
  if (len <= 5) return 1; // 4-5 letters: 2nd letter
  if (len <= 9) return 2; // 6-9 letters: 3rd letter
  if (len <= 12) return 3; // 10-12 letters: 4th letter
  return Math.floor(Math.log2(len - 1)) + 1; // 13+: logarithmic
}

/**
 * Get the actual character index for ORP, accounting for leading punctuation.
 * This adjusts the ORP index to skip over non-letter characters.
 *
 * @param word - The word to calculate actual ORP for
 * @returns The actual character index in the word
 */
export function getActualORPIndex(word: string): number {
  if (!word || typeof word !== 'string') return 0;

  const orpIndex = getORPIndex(word);
  let letterCount = 0;

  for (let i = 0; i < word.length; i++) {
    if (unicodeLetterRegex.test(word[i])) {
      if (letterCount === orpIndex) return i;
      letterCount++;
    }
  }

  return Math.min(orpIndex, word.length - 1);
}

/**
 * Split a word into parts for ORP display: { before, orp, after }
 *
 * @param word - The word to split
 * @returns Object with before, orp, and after parts
 */
export function splitWordForDisplay(word: string): WordParts {
  if (!word || typeof word !== 'string') {
    return { before: '', orp: '', after: '' };
  }

  const orpIndex = getActualORPIndex(word);

  return {
    before: word.slice(0, orpIndex),
    orp: word[orpIndex] || '',
    after: word.slice(orpIndex + 1),
  };
}
