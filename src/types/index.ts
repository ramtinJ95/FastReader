/**
 * Supported AI CLI tools for question generation
 */
export type AICliTool = 'claude' | 'opencode' | 'aider';

/**
 * Settings for the RSVP reader
 */
export interface Settings {
  wordsPerMinute: number;
  fadeEnabled: boolean;
  fadeDuration: number;
  pauseOnPunctuation: boolean;
  punctuationPauseMultiplier: number;
  wordLengthWPMMultiplier: number;
  pauseAfterWords: number;
  pauseDuration: number;
  frameWordCount: number;
  rampUpEnabled: boolean;
  rampUpStartWpm: number;
  rampUpDuration: number; // in seconds
  aiCliTool: AICliTool;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  wordsPerMinute: 300,
  fadeEnabled: true,
  fadeDuration: 150,
  pauseOnPunctuation: true,
  punctuationPauseMultiplier: 2,
  wordLengthWPMMultiplier: 5,
  pauseAfterWords: 0,
  pauseDuration: 500,
  frameWordCount: 1,
  rampUpEnabled: false,
  rampUpStartWpm: 250,
  rampUpDuration: 60, // 1 minute
  aiCliTool: 'claude',
};

/**
 * Saved session data structure
 */
export interface Session {
  text: string;
  currentWordIndex: number;
  totalWords: number;
  settings: Settings;
  savedAt: number;
}

/**
 * Session summary (without full text)
 */
export interface SessionSummary {
  currentWordIndex: number;
  totalWords: number;
  savedAt: number;
  hasText: boolean;
}

/**
 * Word split for ORP display
 */
export interface WordParts {
  before: string;
  orp: string;
  after: string;
}

/**
 * Word frame for multi-word display
 */
export interface WordFrame {
  subset: string[];
  centerOffset: number;
}

/**
 * Playback state
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused';

// Comprehension types
export * from './comprehension';
