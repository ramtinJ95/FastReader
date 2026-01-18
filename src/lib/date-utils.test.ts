import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './date-utils';

describe('formatRelativeTime', () => {
  it('should return "Just now" for timestamps less than a minute ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 30000)).toBe('Just now'); // 30 seconds ago
    expect(formatRelativeTime(now - 59000)).toBe('Just now'); // 59 seconds ago
  });

  it('should return minutes for timestamps under an hour', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 60000)).toBe('1 minute ago');
    expect(formatRelativeTime(now - 120000)).toBe('2 minutes ago');
    expect(formatRelativeTime(now - 1800000)).toBe('30 minutes ago');
    expect(formatRelativeTime(now - 3540000)).toBe('59 minutes ago');
  });

  it('should return hours for timestamps under a day', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 3600000)).toBe('1 hour ago');
    expect(formatRelativeTime(now - 7200000)).toBe('2 hours ago');
    expect(formatRelativeTime(now - 43200000)).toBe('12 hours ago');
    expect(formatRelativeTime(now - 82800000)).toBe('23 hours ago');
  });

  it('should return days for timestamps under a week', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 86400000)).toBe('1 day ago');
    expect(formatRelativeTime(now - 172800000)).toBe('2 days ago');
    expect(formatRelativeTime(now - 518400000)).toBe('6 days ago');
  });

  it('should return locale date string for timestamps over a week', () => {
    const now = Date.now();
    const weekAgo = now - 604800000; // 7 days
    const result = formatRelativeTime(weekAgo);
    // Should be a date string, not relative
    expect(result).not.toContain('ago');
    expect(result).not.toBe('Just now');
  });

  it('should return locale date string for very old timestamps', () => {
    const now = Date.now();
    const monthAgo = now - 2592000000; // 30 days
    const result = formatRelativeTime(monthAgo);
    expect(result).not.toContain('ago');
  });
});
