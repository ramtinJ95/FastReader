import { useState, useEffect, useCallback } from 'react';
import {
  saveSession,
  loadSession,
  hasSession,
  clearSession,
  getSessionSummary,
} from '../lib/progress-storage';
import type { Settings, SessionSummary } from '../types';

export interface UseSessionOptions {
  /** Current text being read */
  text: string;
  /** Current word index */
  currentWordIndex: number;
  /** Current settings */
  settings: Settings;
  /** Called when session is loaded */
  onSessionLoad?: (session: {
    text: string;
    currentWordIndex: number;
    settings: Settings;
  }) => void;
}

export interface UseSessionReturn {
  /** Whether there's a saved session */
  hasSavedSession: boolean;
  /** Summary of saved session (for prompt) */
  sessionSummary: SessionSummary | null;
  /** Whether to show resume prompt */
  showResumePrompt: boolean;
  /** Save current session */
  save: () => boolean;
  /** Load and resume saved session */
  resume: () => void;
  /** Clear saved session and start fresh */
  startFresh: () => void;
  /** Dismiss the resume prompt */
  dismissPrompt: () => void;
}

export function useSession({
  text,
  currentWordIndex,
  settings,
  onSessionLoad,
}: UseSessionOptions): UseSessionReturn {
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Check for saved session on mount
  useEffect(() => {
    if (hasSession()) {
      const summary = getSessionSummary();
      if (summary && summary.hasText) {
        setHasSavedSession(true);
        setSessionSummary(summary);
        setShowResumePrompt(true);
      }
    }
  }, []);

  // Save current session
  const save = useCallback((): boolean => {
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return false;

    const success = saveSession({
      text,
      currentWordIndex,
      totalWords: words.length,
      settings,
    });

    if (success) {
      setHasSavedSession(true);
      setSessionSummary(getSessionSummary());
    }

    return success;
  }, [text, currentWordIndex, settings]);

  // Load and resume saved session
  const resume = useCallback(() => {
    const session = loadSession();
    if (session && onSessionLoad) {
      onSessionLoad({
        text: session.text,
        currentWordIndex: session.currentWordIndex,
        settings: session.settings,
      });
    }
    setShowResumePrompt(false);
  }, [onSessionLoad]);

  // Clear session and start fresh
  const startFresh = useCallback(() => {
    clearSession();
    setHasSavedSession(false);
    setSessionSummary(null);
    setShowResumePrompt(false);
  }, []);

  // Dismiss prompt without action
  const dismissPrompt = useCallback(() => {
    setShowResumePrompt(false);
  }, []);

  return {
    hasSavedSession,
    sessionSummary,
    showResumePrompt,
    save,
    resume,
    startFresh,
    dismissPrompt,
  };
}
