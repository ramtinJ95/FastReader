import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from './useSession';
import { DEFAULT_SETTINGS } from '../types';

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
    _getStore: () => store,
  };
};

describe('useSession Integration', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  it('should complete full session save/load cycle', () => {
    const onSessionLoad = vi.fn();

    // First render - save session
    const { result: result1, unmount } = renderHook(() =>
      useSession({
        text: 'Hello world test content here',
        currentWordIndex: 3,
        settings: { ...DEFAULT_SETTINGS, wordsPerMinute: 400 },
        onSessionLoad,
      })
    );

    act(() => {
      result1.current.save();
    });

    expect(result1.current.hasSavedSession).toBe(true);
    unmount();

    // Second render - should show resume prompt
    const { result: result2 } = renderHook(() =>
      useSession({
        text: 'Different text',
        currentWordIndex: 0,
        settings: DEFAULT_SETTINGS,
        onSessionLoad,
      })
    );

    expect(result2.current.showResumePrompt).toBe(true);
    expect(result2.current.sessionSummary?.currentWordIndex).toBe(3);

    // Resume session
    act(() => {
      result2.current.resume();
    });

    expect(onSessionLoad).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Hello world test content here',
        currentWordIndex: 3,
        settings: expect.objectContaining({ wordsPerMinute: 400 }),
      })
    );
  });

  it('should persist settings across sessions', () => {
    const onSessionLoad = vi.fn();
    const customSettings = {
      ...DEFAULT_SETTINGS,
      wordsPerMinute: 500,
      fadeEnabled: false,
      fadeDuration: 200,
      pauseOnPunctuation: false,
    };

    // Save session with custom settings
    const { result: result1, unmount: unmount1 } = renderHook(() =>
      useSession({
        text: 'Test text for settings persistence',
        currentWordIndex: 2,
        settings: customSettings,
        onSessionLoad,
      })
    );

    act(() => {
      result1.current.save();
    });

    unmount1();

    // Reload and verify settings are preserved
    const { result: result2 } = renderHook(() =>
      useSession({
        text: 'New text',
        currentWordIndex: 0,
        settings: DEFAULT_SETTINGS,
        onSessionLoad,
      })
    );

    act(() => {
      result2.current.resume();
    });

    expect(onSessionLoad).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          wordsPerMinute: 500,
          fadeEnabled: false,
          fadeDuration: 200,
          pauseOnPunctuation: false,
        }),
      })
    );
  });

  it('should clear session and not show prompt after startFresh', () => {
    const onSessionLoad = vi.fn();

    // Save session
    const { result: result1, unmount: unmount1 } = renderHook(() =>
      useSession({
        text: 'Some saved text',
        currentWordIndex: 5,
        settings: DEFAULT_SETTINGS,
        onSessionLoad,
      })
    );

    act(() => {
      result1.current.save();
    });

    unmount1();

    // Load and start fresh
    const { result: result2, unmount: unmount2 } = renderHook(() =>
      useSession({
        text: 'New text',
        currentWordIndex: 0,
        settings: DEFAULT_SETTINGS,
        onSessionLoad,
      })
    );

    expect(result2.current.showResumePrompt).toBe(true);

    act(() => {
      result2.current.startFresh();
    });

    expect(result2.current.showResumePrompt).toBe(false);
    expect(result2.current.hasSavedSession).toBe(false);
    unmount2();

    // Third render - should NOT show resume prompt
    const { result: result3 } = renderHook(() =>
      useSession({
        text: 'Another text',
        currentWordIndex: 0,
        settings: DEFAULT_SETTINGS,
        onSessionLoad,
      })
    );

    expect(result3.current.showResumePrompt).toBe(false);
    expect(result3.current.hasSavedSession).toBe(false);
  });

  it('should handle multiple save operations correctly', () => {
    const onSessionLoad = vi.fn();

    const { result, rerender } = renderHook(
      ({ currentWordIndex }) =>
        useSession({
          text: 'Word one two three four five six seven eight nine ten',
          currentWordIndex,
          settings: DEFAULT_SETTINGS,
          onSessionLoad,
        }),
      { initialProps: { currentWordIndex: 2 } }
    );

    // First save at position 2
    act(() => {
      result.current.save();
    });

    expect(result.current.sessionSummary?.currentWordIndex).toBe(2);

    // Update position and save again
    rerender({ currentWordIndex: 7 });

    act(() => {
      result.current.save();
    });

    expect(result.current.sessionSummary?.currentWordIndex).toBe(7);

    // Verify the latest position is stored
    const storedData = JSON.parse(localStorageMock._getStore()['fastreader-session']);
    expect(storedData.currentWordIndex).toBe(7);
  });

  it('should preserve text content exactly', () => {
    const onSessionLoad = vi.fn();
    const originalText = `This is a multiline text
    with special characters: !@#$%^&*()
    and unicode: émojis 🎉 日本語`;

    // Save session
    const { result: result1, unmount } = renderHook(() =>
      useSession({
        text: originalText,
        currentWordIndex: 5,
        settings: DEFAULT_SETTINGS,
        onSessionLoad,
      })
    );

    act(() => {
      result1.current.save();
    });

    unmount();

    // Load session
    const { result: result2 } = renderHook(() =>
      useSession({
        text: '',
        currentWordIndex: 0,
        settings: DEFAULT_SETTINGS,
        onSessionLoad,
      })
    );

    act(() => {
      result2.current.resume();
    });

    expect(onSessionLoad).toHaveBeenCalledWith(
      expect.objectContaining({
        text: originalText,
      })
    );
  });
});
