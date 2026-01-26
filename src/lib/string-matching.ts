/**
 * String matching utilities for answer checking
 */

/**
 * Calculate Levenshtein distance between two strings.
 * This measures the minimum number of single-character edits
 * (insertions, deletions, substitutions) to transform one string into another.
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Handle edge cases
  if (m === 0) return n;
  if (n === 0) return m;

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculate string similarity as a percentage (0-100).
 * Uses Levenshtein distance normalized by the length of the longer string.
 */
export function stringSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100; // Both empty strings are identical

  const distance = levenshteinDistance(str1, str2);
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * Check if an answer is a fuzzy match for any of the correct answers.
 *
 * @param userAnswer - The user's submitted answer
 * @param correctAnswers - Array of acceptable correct answers
 * @param options - Matching configuration
 * @returns Object with match result and best match details
 */
export function fuzzyMatchAnswer(
  userAnswer: string,
  correctAnswers: string[],
  options: {
    /** Minimum similarity percentage required for a match (0-100) */
    minSimilarity?: number;
    /** Maximum allowed Levenshtein distance for short answers */
    maxDistance?: number;
    /** Case insensitive matching */
    ignoreCase?: boolean;
  } = {}
): {
  isMatch: boolean;
  bestMatch: string | null;
  similarity: number;
  distance: number;
} {
  const {
    minSimilarity = 85,
    maxDistance = 2,
    ignoreCase = true,
  } = options;

  const normalizedUserAnswer = ignoreCase
    ? userAnswer.trim().toLowerCase()
    : userAnswer.trim();

  let bestMatch: string | null = null;
  let bestSimilarity = 0;
  let bestDistance = Infinity;

  for (const correct of correctAnswers) {
    const normalizedCorrect = ignoreCase
      ? correct.trim().toLowerCase()
      : correct.trim();

    // Exact match check first
    if (normalizedUserAnswer === normalizedCorrect) {
      return {
        isMatch: true,
        bestMatch: correct,
        similarity: 100,
        distance: 0,
      };
    }

    const distance = levenshteinDistance(normalizedUserAnswer, normalizedCorrect);
    const similarity = stringSimilarity(normalizedUserAnswer, normalizedCorrect);

    if (similarity > bestSimilarity || (similarity === bestSimilarity && distance < bestDistance)) {
      bestSimilarity = similarity;
      bestDistance = distance;
      bestMatch = correct;
    }
  }

  // Determine if it's a match based on thresholds
  // For short answers (< 8 chars), use distance threshold
  // For longer answers, use similarity percentage
  const avgLen = (normalizedUserAnswer.length + (bestMatch?.length || 0)) / 2;
  const isMatch =
    avgLen < 8
      ? bestDistance <= maxDistance
      : bestSimilarity >= minSimilarity;

  return {
    isMatch,
    bestMatch,
    similarity: Math.round(bestSimilarity),
    distance: bestDistance,
  };
}
