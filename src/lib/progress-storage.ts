import type { Session, SessionSummary } from '../types';

const STORAGE_KEY = 'fastreader-session';

// Max session size in bytes (4MB - leaving room for other localStorage data)
const MAX_SESSION_SIZE = 4 * 1024 * 1024;

export type SaveSessionResult =
  | { success: true }
  | { success: false; reason: 'size_exceeded' | 'storage_error' };

/**
 * Save the current reading session to localStorage
 */
export function saveSession(session: Omit<Session, 'savedAt'>): SaveSessionResult {
  try {
    const data: Session = { ...session, savedAt: Date.now() };
    const jsonString = JSON.stringify(data);

    // Check size before attempting to save
    const sizeInBytes = new Blob([jsonString]).size;
    if (sizeInBytes > MAX_SESSION_SIZE) {
      console.warn(`Session size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${MAX_SESSION_SIZE / 1024 / 1024}MB)`);
      return { success: false, reason: 'size_exceeded' };
    }

    localStorage.setItem(STORAGE_KEY, jsonString);
    return { success: true };
  } catch (error) {
    console.error('Failed to save session:', error);
    return { success: false, reason: 'storage_error' };
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
