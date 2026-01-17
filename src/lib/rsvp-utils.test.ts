import { describe, it, expect } from 'vitest';
import {
  parseText,
  getORPIndex,
  getActualORPIndex,
  splitWordForDisplay,
  getWordDelay,
  shouldPauseAtWord,
  formatTimeRemaining,
  extractWordFrame,
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

describe('getWordDelay', () => {
  it('should calculate base delay from WPM', () => {
    // 300 WPM = 60000ms / 300 = 200ms per word
    expect(getWordDelay('hello', 300, false)).toBe(200);
  });

  it('should return fallback for invalid WPM', () => {
    expect(getWordDelay('hello', 0)).toBe(200);
    expect(getWordDelay('hello', -100)).toBe(200);
  });

  it('should apply punctuation multiplier for sentence endings', () => {
    const baseDelay = 200; // 300 WPM
    expect(getWordDelay('hello.', 300, true, 2)).toBe(baseDelay * 2);
    expect(getWordDelay('hello!', 300, true, 2)).toBe(baseDelay * 2);
    expect(getWordDelay('hello?', 300, true, 2)).toBe(baseDelay * 2);
  });

  it('should apply 1.5x multiplier for commas', () => {
    const baseDelay = 200;
    expect(getWordDelay('hello,', 300, true, 2)).toBe(baseDelay * 1.5);
  });

  it('should not apply punctuation delay when disabled', () => {
    expect(getWordDelay('hello.', 300, false)).toBe(200);
  });

  it('should apply long word multiplier', () => {
    // 12-char word with 5% multiplier per extra char
    const longWord = 'abcdefghijklmn'; // 14 chars, 2 extra
    const baseDelay = 200;
    // 2 extra chars * 5% = 10% increase
    expect(getWordDelay(longWord, 300, false, 2, 5)).toBe(baseDelay * 1.1);
  });
});

describe('shouldPauseAtWord', () => {
  it('should return false when pauseAfterWords is 0', () => {
    expect(shouldPauseAtWord(10, 0)).toBe(false);
  });

  it('should return false for word index 0', () => {
    expect(shouldPauseAtWord(0, 5)).toBe(false);
  });

  it('should return true at pause intervals', () => {
    expect(shouldPauseAtWord(5, 5)).toBe(true);
    expect(shouldPauseAtWord(10, 5)).toBe(true);
    expect(shouldPauseAtWord(15, 5)).toBe(true);
  });

  it('should return false between intervals', () => {
    expect(shouldPauseAtWord(3, 5)).toBe(false);
    expect(shouldPauseAtWord(7, 5)).toBe(false);
  });
});

describe('formatTimeRemaining', () => {
  it('should return "0:00" for zero or negative words', () => {
    expect(formatTimeRemaining(0, 300)).toBe('0:00');
    expect(formatTimeRemaining(-10, 300)).toBe('0:00');
  });

  it('should return "0:00" for invalid WPM', () => {
    expect(formatTimeRemaining(100, 0)).toBe('0:00');
    expect(formatTimeRemaining(100, -300)).toBe('0:00');
  });

  it('should calculate correct time', () => {
    // 300 words at 300 WPM = 1 minute
    expect(formatTimeRemaining(300, 300)).toBe('1:00');

    // 150 words at 300 WPM = 30 seconds
    expect(formatTimeRemaining(150, 300)).toBe('0:30');

    // 450 words at 300 WPM = 1:30
    expect(formatTimeRemaining(450, 300)).toBe('1:30');
  });

  it('should pad seconds with leading zero', () => {
    // 5 words at 300 WPM = 1 second
    expect(formatTimeRemaining(5, 300)).toBe('0:01');
  });
});

describe('extractWordFrame', () => {
  const words = ['one', 'two', 'three', 'four', 'five'];

  it('should return single word for frameSize 1', () => {
    expect(extractWordFrame(words, 2, 1)).toEqual({
      subset: ['three'],
      centerOffset: 0,
    });
  });

  it('should extract frame centered on index', () => {
    // Frame of 3 centered on index 2 ('three')
    expect(extractWordFrame(words, 2, 3)).toEqual({
      subset: ['two', 'three', 'four'],
      centerOffset: 1,
    });
  });

  it('should handle edge at beginning', () => {
    // Frame of 3 centered on index 0
    expect(extractWordFrame(words, 0, 3)).toEqual({
      subset: ['one', 'two'],
      centerOffset: 0,
    });
  });

  it('should handle edge at end', () => {
    // Frame of 3 centered on last index
    expect(extractWordFrame(words, 4, 3)).toEqual({
      subset: ['four', 'five'],
      centerOffset: 1,
    });
  });

  it('should handle frameSize larger than array', () => {
    expect(extractWordFrame(words, 2, 10)).toEqual({
      subset: words,
      centerOffset: 2,
    });
  });
});
