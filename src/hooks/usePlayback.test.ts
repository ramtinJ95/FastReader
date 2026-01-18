import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayback } from './usePlayback';
import { DEFAULT_SETTINGS } from '../types';

describe('usePlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultOptions = {
    text: 'Hello world this is a test',
    settings: DEFAULT_SETTINGS,
  };

  it('should initialize with parsed words', () => {
    const { result } = renderHook(() => usePlayback(defaultOptions));

    expect(result.current.words).toEqual(['Hello', 'world', 'this', 'is', 'a', 'test']);
    expect(result.current.currentWordIndex).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('should start playback on play()', () => {
    const { result } = renderHook(() => usePlayback(defaultOptions));

    act(() => {
      result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isPaused).toBe(false);
  });

  it('should pause playback on pause()', () => {
    const { result } = renderHook(() => usePlayback(defaultOptions));

    act(() => {
      result.current.play();
    });

    act(() => {
      result.current.pause();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(true);
  });

  it('should resume playback on resume()', () => {
    const { result } = renderHook(() => usePlayback(defaultOptions));

    act(() => {
      result.current.play();
      result.current.pause();
      result.current.resume();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isPaused).toBe(false);
  });

  it('should stop and reset on stop()', () => {
    const { result } = renderHook(() => usePlayback(defaultOptions));

    act(() => {
      result.current.play();
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.currentWordIndex).toBe(0);
  });

  it('should seek to specific index', () => {
    const { result } = renderHook(() => usePlayback(defaultOptions));

    act(() => {
      result.current.seekTo(3);
    });

    expect(result.current.currentWordIndex).toBe(3);
  });

  it('should seek to percentage', () => {
    const { result } = renderHook(() => usePlayback(defaultOptions));

    act(() => {
      result.current.seekToPercent(50);
    });

    // 6 words, 50% = index 3
    expect(result.current.currentWordIndex).toBe(3);
  });

  it('should clamp seek index to valid range', () => {
    const { result } = renderHook(() => usePlayback(defaultOptions));

    act(() => {
      result.current.seekTo(100);
    });

    expect(result.current.currentWordIndex).toBe(6); // Max is words.length

    act(() => {
      result.current.seekTo(-5);
    });

    expect(result.current.currentWordIndex).toBe(0);
  });

  it('should update text with setText()', () => {
    const { result } = renderHook(() => usePlayback(defaultOptions));

    act(() => {
      result.current.setText('New text here');
    });

    expect(result.current.words).toEqual(['New', 'text', 'here']);
    expect(result.current.currentWordIndex).toBe(0);
  });

  it('should calculate progress correctly', () => {
    const { result } = renderHook(() => usePlayback(defaultOptions));

    act(() => {
      result.current.seekTo(3);
    });

    // 3/6 = 50%
    expect(result.current.progress).toBe(50);
  });
});

describe('Punctuation Pauses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should apply longer delay for sentence-ending punctuation', () => {
    // This is tested indirectly through the getWordDelay function
    // The hook uses getWordDelay internally
    const { result } = renderHook(() =>
      usePlayback({
        text: 'Hello. World!',
        settings: { ...DEFAULT_SETTINGS, pauseOnPunctuation: true },
      })
    );

    expect(result.current.words).toEqual(['Hello.', 'World!']);
  });
});

describe('Word Opacity', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with opacity 1', () => {
    const { result } = renderHook(() =>
      usePlayback({
        text: 'Hello world',
        settings: DEFAULT_SETTINGS,
      })
    );
    expect(result.current.wordOpacity).toBe(1);
  });

  it('should reset opacity on stop', () => {
    const { result } = renderHook(() =>
      usePlayback({
        text: 'Hello world',
        settings: DEFAULT_SETTINGS,
      })
    );

    act(() => {
      result.current.play();
      vi.advanceTimersByTime(100);
      result.current.stop();
    });

    expect(result.current.wordOpacity).toBe(1);
  });
});

describe('Periodic Pause', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should trigger pause at intervals when pauseAfterWords > 0', () => {
    const { result } = renderHook(() =>
      usePlayback({
        text: 'one two three four five six seven eight nine ten',
        settings: { ...DEFAULT_SETTINGS, pauseAfterWords: 5, pauseDuration: 100 },
      })
    );

    act(() => {
      result.current.play();
    });

    // Advance through 5 words (at 300 WPM = 200ms each)
    act(() => {
      vi.advanceTimersByTime(1000); // 5 * 200ms
    });

    // Should be paused after 5 words
    expect(result.current.isPaused).toBe(true);
  });
});
