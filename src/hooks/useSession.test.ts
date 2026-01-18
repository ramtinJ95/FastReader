import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from './useSession';
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

describe('useSession', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const defaultOptions = {
    text: 'Hello world test',
    currentWordIndex: 1,
    settings: DEFAULT_SETTINGS,
  };

  it('should initialize without saved session', () => {
    const { result } = renderHook(() => useSession(defaultOptions));

    expect(result.current.hasSavedSession).toBe(false);
    expect(result.current.sessionSummary).toBeNull();
    expect(result.current.showResumePrompt).toBe(false);
  });

  it('should save session', () => {
    const { result } = renderHook(() => useSession(defaultOptions));

    act(() => {
      result.current.save();
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
    expect(result.current.hasSavedSession).toBe(true);
  });

  it('should show resume prompt when session exists', () => {
    // Pre-populate localStorage
    const session = {
      text: 'Saved text',
      currentWordIndex: 5,
      totalWords: 10,
      settings: DEFAULT_SETTINGS,
      savedAt: Date.now(),
    };
    localStorageMock.setItem('fastreader-session', JSON.stringify(session));

    const { result } = renderHook(() => useSession(defaultOptions));

    expect(result.current.showResumePrompt).toBe(true);
    expect(result.current.sessionSummary).not.toBeNull();
  });

  it('should call onSessionLoad when resuming', () => {
    const session = {
      text: 'Saved text here',
      currentWordIndex: 5,
      totalWords: 10,
      settings: DEFAULT_SETTINGS,
      savedAt: Date.now(),
    };
    localStorageMock.setItem('fastreader-session', JSON.stringify(session));

    const onSessionLoad = vi.fn();
    const { result } = renderHook(() =>
      useSession({ ...defaultOptions, onSessionLoad })
    );

    act(() => {
      result.current.resume();
    });

    expect(onSessionLoad).toHaveBeenCalledWith({
      text: 'Saved text here',
      currentWordIndex: 5,
      settings: DEFAULT_SETTINGS,
    });
    expect(result.current.showResumePrompt).toBe(false);
  });

  it('should clear session on startFresh', () => {
    const session = {
      text: 'Saved text',
      currentWordIndex: 5,
      totalWords: 10,
      settings: DEFAULT_SETTINGS,
      savedAt: Date.now(),
    };
    localStorageMock.setItem('fastreader-session', JSON.stringify(session));

    const { result } = renderHook(() => useSession(defaultOptions));

    act(() => {
      result.current.startFresh();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('fastreader-session');
    expect(result.current.hasSavedSession).toBe(false);
    expect(result.current.showResumePrompt).toBe(false);
  });

  it('should dismiss prompt', () => {
    const session = {
      text: 'Saved text',
      currentWordIndex: 5,
      totalWords: 10,
      settings: DEFAULT_SETTINGS,
      savedAt: Date.now(),
    };
    localStorageMock.setItem('fastreader-session', JSON.stringify(session));

    const { result } = renderHook(() => useSession(defaultOptions));

    expect(result.current.showResumePrompt).toBe(true);

    act(() => {
      result.current.dismissPrompt();
    });

    expect(result.current.showResumePrompt).toBe(false);
    // Session should still exist
    expect(result.current.hasSavedSession).toBe(true);
  });

  it('should not save empty text', () => {
    const { result } = renderHook(() =>
      useSession({ ...defaultOptions, text: '   ' })
    );

    let success: boolean = false;
    act(() => {
      success = result.current.save();
    });

    expect(success).toBe(false);
    expect(result.current.hasSavedSession).toBe(false);
  });

  it('should update session summary after save', () => {
    const { result } = renderHook(() =>
      useSession({
        text: 'one two three four five',
        currentWordIndex: 2,
        settings: DEFAULT_SETTINGS,
      })
    );

    act(() => {
      result.current.save();
    });

    expect(result.current.sessionSummary).not.toBeNull();
    expect(result.current.sessionSummary?.currentWordIndex).toBe(2);
    expect(result.current.sessionSummary?.totalWords).toBe(5);
  });
});
