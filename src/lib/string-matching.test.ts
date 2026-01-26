import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  stringSimilarity,
  fuzzyMatchAnswer,
} from './string-matching';

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('returns length of other string when one is empty', () => {
    expect(levenshteinDistance('', 'hello')).toBe(5);
    expect(levenshteinDistance('hello', '')).toBe(5);
  });

  it('calculates single character edits', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1); // substitution
    expect(levenshteinDistance('cat', 'cats')).toBe(1); // insertion
    expect(levenshteinDistance('cats', 'cat')).toBe(1); // deletion
  });

  it('calculates multiple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('decision', 'decisons')).toBe(2);
  });

  it('is case sensitive', () => {
    expect(levenshteinDistance('Hello', 'hello')).toBe(1);
  });
});

describe('stringSimilarity', () => {
  it('returns 100 for identical strings', () => {
    expect(stringSimilarity('hello', 'hello')).toBe(100);
  });

  it('returns 100 for two empty strings', () => {
    expect(stringSimilarity('', '')).toBe(100);
  });

  it('calculates percentage similarity', () => {
    // "cat" vs "bat" = 1 edit out of 3 chars = 66.67%
    const similarity = stringSimilarity('cat', 'bat');
    expect(similarity).toBeCloseTo(66.67, 0);
  });

  it('handles longer strings', () => {
    // "decision" (8 chars) vs "decisions" (9 chars) = 1 edit out of 9 = 88.89%
    const similarity = stringSimilarity('decision', 'decisions');
    expect(similarity).toBeCloseTo(88.89, 0);
  });
});

describe('fuzzyMatchAnswer', () => {
  it('matches exact answers case-insensitively', () => {
    const result = fuzzyMatchAnswer('DECISION', ['decision', 'decisions']);
    expect(result.isMatch).toBe(true);
    expect(result.similarity).toBe(100);
    expect(result.distance).toBe(0);
  });

  it('matches with small typos for short words', () => {
    // "decison" has 1 typo from "decision"
    const result = fuzzyMatchAnswer('decison', ['decision', 'decisions']);
    expect(result.isMatch).toBe(true);
    expect(result.distance).toBeLessThanOrEqual(2);
  });

  it('matches plural variations', () => {
    const result = fuzzyMatchAnswer('decision', ['decisions']);
    expect(result.isMatch).toBe(true);
  });

  it('rejects completely wrong answers', () => {
    const result = fuzzyMatchAnswer('banana', ['decision', 'decisions']);
    expect(result.isMatch).toBe(false);
    expect(result.similarity).toBeLessThan(50);
  });

  it('handles common misspellings', () => {
    const result = fuzzyMatchAnswer('recieve', ['receive']);
    expect(result.isMatch).toBe(true);
    expect(result.distance).toBe(2);
  });

  it('respects case sensitivity option', () => {
    const result = fuzzyMatchAnswer('HELLO', ['hello'], { ignoreCase: false });
    expect(result.similarity).toBeLessThan(100);
  });

  it('uses similarity threshold for longer answers', () => {
    // Test with a longer phrase
    const result = fuzzyMatchAnswer(
      'data pipelines and storage',
      ['data pipelines, orchestration, data storage']
    );
    // These are quite different, should not match
    expect(result.isMatch).toBe(false);
  });

  it('finds the best match among multiple options', () => {
    const result = fuzzyMatchAnswer('deccision', ['choice', 'decision', 'option']);
    expect(result.bestMatch).toBe('decision');
    expect(result.isMatch).toBe(true);
  });

  it('handles empty arrays', () => {
    const result = fuzzyMatchAnswer('hello', []);
    expect(result.isMatch).toBe(false);
    expect(result.bestMatch).toBe(null);
  });

  it('handles whitespace differences', () => {
    const result = fuzzyMatchAnswer('  decision  ', ['decision']);
    expect(result.isMatch).toBe(true);
    expect(result.distance).toBe(0);
  });
});
