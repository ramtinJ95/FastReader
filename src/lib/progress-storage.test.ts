import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveSession,
  loadSession,
  hasSession,
  clearSession,
  getSessionSummary,
  percentageToWordIndex,
  wordIndexToPercentage,
} from './progress-storage';
import { DEFAULT_SETTINGS } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('progress-storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('saveSession', () => {
    it('should save session to localStorage', () => {
      const session = {
        text: 'Hello world',
        currentWordIndex: 5,
        totalWords: 100,
        settings: DEFAULT_SETTINGS,
      };

      const result = saveSession(session);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('loadSession', () => {
    it('should return null when no session exists', () => {
      expect(loadSession()).toBeNull();
    });

    it('should load saved session', () => {
      const session = {
        text: 'Hello world',
        currentWordIndex: 5,
        totalWords: 100,
        settings: DEFAULT_SETTINGS,
        savedAt: Date.now(),
      };

      localStorageMock.setItem('fastreader-session', JSON.stringify(session));

      const loaded = loadSession();
      expect(loaded).toEqual(session);
    });
  });

  describe('hasSession', () => {
    it('should return false when no session exists', () => {
      expect(hasSession()).toBe(false);
    });

    it('should return true when session exists', () => {
      localStorageMock.setItem('fastreader-session', '{}');
      expect(hasSession()).toBe(true);
    });
  });

  describe('clearSession', () => {
    it('should remove session from localStorage', () => {
      localStorageMock.setItem('fastreader-session', '{}');

      const result = clearSession();

      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fastreader-session');
    });
  });

  describe('getSessionSummary', () => {
    it('should return null when no session exists', () => {
      expect(getSessionSummary()).toBeNull();
    });

    it('should return summary without full text', () => {
      const session = {
        text: 'Hello world',
        currentWordIndex: 5,
        totalWords: 100,
        settings: DEFAULT_SETTINGS,
        savedAt: 1234567890,
      };

      localStorageMock.setItem('fastreader-session', JSON.stringify(session));

      const summary = getSessionSummary();
      expect(summary).toEqual({
        currentWordIndex: 5,
        totalWords: 100,
        savedAt: 1234567890,
        hasText: true,
      });
    });
  });

  describe('percentageToWordIndex', () => {
    it('should return 0 for invalid totalWords', () => {
      expect(percentageToWordIndex(50, 0)).toBe(0);
      expect(percentageToWordIndex(50, -10)).toBe(0);
    });

    it('should calculate correct index', () => {
      expect(percentageToWordIndex(0, 100)).toBe(0);
      expect(percentageToWordIndex(50, 100)).toBe(50);
      expect(percentageToWordIndex(100, 100)).toBe(100);
    });

    it('should clamp percentage to 0-100', () => {
      expect(percentageToWordIndex(-10, 100)).toBe(0);
      expect(percentageToWordIndex(150, 100)).toBe(100);
    });
  });

  describe('wordIndexToPercentage', () => {
    it('should return 0 for invalid totalWords', () => {
      expect(wordIndexToPercentage(50, 0)).toBe(0);
    });

    it('should calculate correct percentage', () => {
      expect(wordIndexToPercentage(0, 100)).toBe(0);
      expect(wordIndexToPercentage(50, 100)).toBe(50);
      expect(wordIndexToPercentage(100, 100)).toBe(100);
    });
  });
});
