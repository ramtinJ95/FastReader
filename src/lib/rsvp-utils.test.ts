import { describe, it, expect } from 'vitest';
import { parseText } from './rsvp-utils';

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
