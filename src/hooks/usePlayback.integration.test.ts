import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayback } from './usePlayback';
import { DEFAULT_SETTINGS } from '../types';

describe('usePlayback Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should complete full playback cycle', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      usePlayback({
        text: 'One two three',
        settings: { ...DEFAULT_SETTINGS, fadeEnabled: false },
        onComplete,
      })
    );

    // Start playback - play() immediately shows first word (index becomes 1)
    act(() => {
      result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentWordIndex).toBe(1); // First word shown immediately

    // Advance to second word (200ms at 300 WPM)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.currentWordIndex).toBe(2);

    // Advance to third word
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.currentWordIndex).toBe(3);

    // Should complete after last word's display time
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isPlaying).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });

  it('should handle pause/resume cycle', () => {
    const { result } = renderHook(() =>
      usePlayback({
        text: 'One two three four five',
        settings: { ...DEFAULT_SETTINGS, fadeEnabled: false },
      })
    );

    // Play and advance
    act(() => {
      result.current.play();
      vi.advanceTimersByTime(400); // 2 words
    });

    const indexBeforePause = result.current.currentWordIndex;

    // Pause
    act(() => {
      result.current.pause();
    });

    expect(result.current.isPaused).toBe(true);

    // Time passes but index shouldn't change
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.currentWordIndex).toBe(indexBeforePause);

    // Resume
    act(() => {
      result.current.resume();
    });

    expect(result.current.isPlaying).toBe(true);

    // Advance more
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.currentWordIndex).toBeGreaterThan(indexBeforePause);
  });

  it('should handle restart correctly', () => {
    const { result } = renderHook(() =>
      usePlayback({
        text: 'One two three',
        settings: { ...DEFAULT_SETTINGS, fadeEnabled: false },
      })
    );

    // Play and advance
    act(() => {
      result.current.play();
      vi.advanceTimersByTime(400); // 2 words
    });

    expect(result.current.currentWordIndex).toBeGreaterThan(0);

    // Restart
    act(() => {
      result.current.restart();
      vi.advanceTimersByTime(0); // Let setTimeout fire
    });

    // Should be playing from beginning
    expect(result.current.isPlaying).toBe(true);
  });
});
