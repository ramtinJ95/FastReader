import type { Session, SessionSummary } from '../types';

const STORAGE_KEY = 'fastreader-session';

/**
 * Save the current reading session to localStorage
 */
export function saveSession(session: Omit<Session, 'savedAt'>): boolean {
  try {
    const data: Session = { ...session, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save session:', error);
    return false;
  }
}

/**
 * Load a saved reading session from localStorage
 */
export function loadSession(): Session | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load session:', error);
    return null;
  }
}

/**
 * Check if a saved session exists
 */
export function hasSession(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Clear the saved session from localStorage
 */
export function clearSession(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear session:', error);
    return false;
  }
}

/**
 * Get a summary of the saved session without loading full text
 */
export function getSessionSummary(): SessionSummary | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const parsed: Session = JSON.parse(data);
    return {
      currentWordIndex: parsed.currentWordIndex,
      totalWords: parsed.totalWords,
      savedAt: parsed.savedAt,
      hasText: !!parsed.text,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate word index from a percentage
 */
export function percentageToWordIndex(percentage: number, totalWords: number): number {
  if (!totalWords || totalWords <= 0) return 0;
  const clamped = Math.max(0, Math.min(100, percentage));
  return Math.floor((clamped / 100) * totalWords);
}

/**
 * Calculate percentage from word index
 */
export function wordIndexToPercentage(wordIndex: number, totalWords: number): number {
  if (!totalWords || totalWords <= 0) return 0;
  return Math.round((wordIndex / totalWords) * 100);
}
