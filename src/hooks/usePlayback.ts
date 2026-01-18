import { useState, useRef, useCallback, useEffect } from 'react';
import { parseText, getWordDelay, shouldPauseAtWord } from '../lib/rsvp-utils';
import type { Settings } from '../types';

export interface UsePlaybackOptions {
  /** Text to read */
  text: string;
  /** Reader settings */
  settings: Settings;
  /** Called when playback completes */
  onComplete?: () => void;
  /** Called when word changes */
  onWordChange?: (index: number, word: string) => void;
}

export interface UsePlaybackReturn {
  /** Array of parsed words */
  words: string[];
  /** Current word index (1-based during playback, 0 when stopped) */
  currentWordIndex: number;
  /** Current word being displayed */
  currentWord: string;
  /** Whether currently playing */
  isPlaying: boolean;
  /** Whether currently paused */
  isPaused: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Word opacity for fade effect */
  wordOpacity: number;
  /** Start playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Resume from pause */
  resume: () => void;
  /** Stop and reset */
  stop: () => void;
  /** Restart from beginning */
  restart: () => void;
  /** Seek to specific word index */
  seekTo: (index: number) => void;
  /** Seek to percentage */
  seekToPercent: (percent: number) => void;
  /** Set new text */
  setText: (newText: string) => void;
}

export function usePlayback({
  text,
  settings,
  onComplete,
  onWordChange,
}: UsePlaybackOptions): UsePlaybackReturn {
  // Parse words from text
  const [words, setWords] = useState<string[]>(() => parseText(text));

  // Playback state
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [wordOpacity, setWordOpacity] = useState(1);

  // Refs for timers (to avoid stale closures)
  const playbackTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const currentIndexRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentIndexRef.current = currentWordIndex;
  }, [currentWordIndex]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  // Calculate progress
  const progress = words.length > 0 ? (currentWordIndex / words.length) * 100 : 0;

  // Get current word (empty when stopped/at index 0)
  const currentWord = currentWordIndex > 0 ? words[currentWordIndex - 1] : '';

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  // Show next word - defined before scheduleNextWord due to mutual recursion
  const showNextWord = useCallback(() => {
    const index = currentIndexRef.current;

    // Stop if at end
    if (index >= words.length) {
      setIsPlaying(false);
      setIsPaused(false);
      onComplete?.();
      return;
    }

    // Check for periodic pause
    if (shouldPauseAtWord(index, settings.pauseAfterWords)) {
      setIsPaused(true);
      playbackTimerRef.current = window.setTimeout(() => {
        if (isPlayingRef.current) {
          setIsPaused(false);
          // Schedule next word after pause
          const word = words[currentIndexRef.current - 1] || '';
          const delay = getWordDelay(
            word,
            settings.wordsPerMinute,
            settings.pauseOnPunctuation,
            settings.punctuationPauseMultiplier,
            settings.wordLengthWPMMultiplier
          );
          playbackTimerRef.current = window.setTimeout(() => {
            if (isPlayingRef.current) {
              showNextWord();
            }
          }, delay);
        }
      }, settings.pauseDuration);
      return;
    }

    // Handle fade effect
    if (settings.fadeEnabled) {
      setWordOpacity(0);
      fadeTimerRef.current = window.setTimeout(() => {
        setWordOpacity(1);
      }, 10);
    }

    // Advance to next word
    const newIndex = index + 1;
    setCurrentWordIndex(newIndex);
    currentIndexRef.current = newIndex;

    // Notify
    if (onWordChange) {
      onWordChange(newIndex, words[newIndex - 1] || '');
    }

    // Schedule next word
    const word = words[newIndex - 1] || '';
    const delay = getWordDelay(
      word,
      settings.wordsPerMinute,
      settings.pauseOnPunctuation,
      settings.punctuationPauseMultiplier,
      settings.wordLengthWPMMultiplier
    );

    playbackTimerRef.current = window.setTimeout(() => {
      if (isPlayingRef.current) {
        showNextWord();
      }
    }, delay);
  }, [words, settings, onComplete, onWordChange]);

  // Play
  const play = useCallback(() => {
    if (words.length === 0) return;

    setIsPlaying(true);
    setIsPaused(false);
    isPlayingRef.current = true;

    // Start from beginning if at end
    if (currentIndexRef.current >= words.length) {
      setCurrentWordIndex(0);
      currentIndexRef.current = 0;
    }

    showNextWord();
  }, [words.length, showNextWord]);

  // Pause
  const pause = useCallback(() => {
    clearTimers();
    setIsPlaying(false);
    setIsPaused(true);
    isPlayingRef.current = false;
  }, [clearTimers]);

  // Resume
  const resume = useCallback(() => {
    if (currentIndexRef.current < words.length) {
      setIsPlaying(true);
      setIsPaused(false);
      isPlayingRef.current = true;

      // Schedule next word
      const word = words[currentIndexRef.current - 1] || '';
      const delay = getWordDelay(
        word,
        settings.wordsPerMinute,
        settings.pauseOnPunctuation,
        settings.punctuationPauseMultiplier,
        settings.wordLengthWPMMultiplier
      );

      playbackTimerRef.current = window.setTimeout(() => {
        if (isPlayingRef.current) {
          showNextWord();
        }
      }, delay);
    }
  }, [words, settings, showNextWord]);

  // Stop
  const stop = useCallback(() => {
    clearTimers();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordIndex(0);
    setWordOpacity(1);
    isPlayingRef.current = false;
    currentIndexRef.current = 0;
  }, [clearTimers]);

  // Restart
  const restart = useCallback(() => {
    stop();
    // Use setTimeout to ensure stop completes first
    setTimeout(() => {
      play();
    }, 0);
  }, [stop, play]);

  // Seek to index
  const seekTo = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(words.length, index));
      setCurrentWordIndex(clampedIndex);
      currentIndexRef.current = clampedIndex;
    },
    [words.length]
  );

  // Seek to percentage
  const seekToPercent = useCallback(
    (percent: number) => {
      const clampedPercent = Math.max(0, Math.min(100, percent));
      const index = Math.floor((clampedPercent / 100) * words.length);
      seekTo(index);
    },
    [words.length, seekTo]
  );

  // Set new text
  const setText = useCallback(
    (newText: string) => {
      stop();
      const newWords = parseText(newText);
      setWords(newWords);
    },
    [stop]
  );

  return {
    words,
    currentWordIndex,
    currentWord,
    isPlaying,
    isPaused,
    progress,
    wordOpacity,
    play,
    pause,
    resume,
    stop,
    restart,
    seekTo,
    seekToPercent,
    setText,
  };
}
