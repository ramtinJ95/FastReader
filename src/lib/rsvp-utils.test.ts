import { describe, it, expect } from 'vitest';
import {
  parseText,
  getORPIndex,
  getActualORPIndex,
  splitWordForDisplay,
} from './rsvp-utils';

describe('parseText', () => {
  it('should return empty array for empty string', () => {
    expect(parseText('')).toEqual([]);
  });

  it('should return empty array for null/undefined', () => {
    expect(parseText(null as unknown as string)).toEqual([]);
    expect(parseText(undefined as unknown as string)).toEqual([]);
  });

  it('should split text by whitespace', () => {
    expect(parseText('hello world')).toEqual(['hello', 'world']);
  });

  it('should handle multiple spaces', () => {
    expect(parseText('hello    world')).toEqual(['hello', 'world']);
  });

  it('should handle newlines and tabs', () => {
    expect(parseText('hello\nworld\tthere')).toEqual(['hello', 'world', 'there']);
  });

  it('should trim leading and trailing whitespace', () => {
    expect(parseText('  hello world  ')).toEqual(['hello', 'world']);
  });

  it('should handle punctuation attached to words', () => {
    expect(parseText('Hello, world!')).toEqual(['Hello,', 'world!']);
  });
});

describe('getORPIndex', () => {
  it('should return 0 for empty/invalid input', () => {
    expect(getORPIndex('')).toBe(0);
    expect(getORPIndex(null as unknown as string)).toBe(0);
  });

  it('should return 0 for 1-3 letter words', () => {
    expect(getORPIndex('a')).toBe(0);
    expect(getORPIndex('ab')).toBe(0);
    expect(getORPIndex('abc')).toBe(0);
  });

  it('should return 1 for 4-5 letter words', () => {
    expect(getORPIndex('abcd')).toBe(1);
    expect(getORPIndex('abcde')).toBe(1);
  });

  it('should return 2 for 6-9 letter words', () => {
    expect(getORPIndex('abcdef')).toBe(2);
    expect(getORPIndex('abcdefghi')).toBe(2);
  });

  it('should return 3 for 10-12 letter words', () => {
    expect(getORPIndex('abcdefghij')).toBe(3);
    expect(getORPIndex('abcdefghijkl')).toBe(3);
  });

  it('should handle words with punctuation', () => {
    // "Hello," has 5 letters, so ORP index should be 1
    expect(getORPIndex('Hello,')).toBe(1);
  });

  it('should handle Unicode letters', () => {
    expect(getORPIndex('привет')).toBe(2); // 6 Cyrillic letters
    expect(getORPIndex('日本語')).toBe(0); // 3 CJK characters
  });
});

describe('getActualORPIndex', () => {
  it('should return same as getORPIndex for words without leading punctuation', () => {
    expect(getActualORPIndex('hello')).toBe(1); // 5 letters -> ORP index 1
  });

  it('should skip leading punctuation', () => {
    expect(getActualORPIndex('"hello')).toBe(2); // Skip quote, then 'e' is at index 2
  });

  it('should handle multiple leading punctuation marks', () => {
    // '..."test' has 4 letters "test", ORP index 1 -> 'e', which is at character index 5
    expect(getActualORPIndex('..."test')).toBe(5);
  });
});

describe('splitWordForDisplay', () => {
  it('should return empty parts for empty input', () => {
    expect(splitWordForDisplay('')).toEqual({ before: '', orp: '', after: '' });
  });

  it('should split word correctly', () => {
    // "hello" (5 letters) -> ORP index 1 -> 'e'
    expect(splitWordForDisplay('hello')).toEqual({
      before: 'h',
      orp: 'e',
      after: 'llo',
    });
  });

  it('should handle single character', () => {
    expect(splitWordForDisplay('a')).toEqual({
      before: '',
      orp: 'a',
      after: '',
    });
  });

  it('should handle words with leading punctuation', () => {
    // '"hello' -> ORP for "hello" is 'e' which is at index 2
    expect(splitWordForDisplay('"hello')).toEqual({
      before: '"h',
      orp: 'e',
      after: 'llo',
    });
  });
});
