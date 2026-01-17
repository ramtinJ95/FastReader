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

/**
 * Calculate the display delay for a word based on WPM and settings.
 *
 * @param word - The word to calculate delay for
 * @param wordsPerMinute - Reading speed in WPM
 * @param pauseOnPunctuation - Whether to add extra pause on punctuation
 * @param punctuationMultiplier - Multiplier for sentence-ending punctuation
 * @param wordLengthWPMMultiplier - Percentage increase per char for long words
 * @returns Delay in milliseconds
 */
export function getWordDelay(
  word: string,
  wordsPerMinute: number,
  pauseOnPunctuation: boolean = true,
  punctuationMultiplier: number = 2,
  wordLengthWPMMultiplier: number = 0
): number {
  if (!word || typeof word !== 'string') return 60000 / wordsPerMinute;
  if (!wordsPerMinute || wordsPerMinute <= 0) return 200; // Default fallback

  let baseDelay = 60000 / wordsPerMinute;

  // Longer pause for long words (12+ characters)
  if (wordLengthWPMMultiplier > 0 && word.length >= 12) {
    baseDelay *= 1 + (wordLengthWPMMultiplier / 100) * (word.length - 12);
  }

  if (pauseOnPunctuation) {
    // Sentence-ending punctuation: configurable multiplier (default 2x)
    if (/[.!?;:]$/.test(word)) {
      return baseDelay * punctuationMultiplier;
    }
    // Commas: 1.5x delay
    if (/[,]$/.test(word)) {
      return baseDelay * 1.5;
    }
  }

  return baseDelay;
}

/**
 * Check if auto-pause should trigger at this word index.
 *
 * @param wordIndex - Current word index (0-based)
 * @param pauseAfterWords - Pause after every N words (0 = disabled)
 * @returns Whether to pause
 */
export function shouldPauseAtWord(wordIndex: number, pauseAfterWords: number): boolean {
  if (pauseAfterWords <= 0) return false;
  if (wordIndex <= 0) return false;
  return wordIndex % pauseAfterWords === 0;
}
