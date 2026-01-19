/**
 * Comprehension Feature Types
 *
 * These types mirror the PocketBase collections and are used
 * for type-safe API interactions.
 */

// Document stored in PocketBase
export interface ComprehensionDocument {
  id: string;
  title: string;
  content: string;
  source_type: 'paste' | 'file' | 'url';
  source_path?: string;
  file_type?: 'txt' | 'md' | 'pdf';
  word_count: number;
  created: string;
  updated: string;
}

// Reading session
export interface ReadingSession {
  id: string;
  document: string; // Relation ID
  current_word_index: number;
  total_words: number;
  progress_percent: number;
  wpm_setting: number;
  chunk_size: number;
  is_active: boolean;
  completed_at?: string;
  created: string;
  updated: string;
}

// Question types
export type QuestionType = 'multiple_choice' | 'short_answer' | 'fill_in_blank';
export type ComprehensionType = 'factual_recall' | 'inference' | 'synthesis';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Generated question
export interface Question {
  id: string;
  document: string;
  session?: string;
  question_text: string;
  question_type: QuestionType;
  comprehension_type: ComprehensionType;
  difficulty?: DifficultyLevel;

  // Multiple choice fields
  options?: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  distractor_explanations?: { A: string; B: string; C: string; D: string };

  // Short answer fields
  ideal_answer?: string;
  acceptable_variations?: string[];
  required_concepts?: string[];
  scoring_rubric?: {
    full_credit: string;
    partial_credit: string;
    no_credit: string;
  };

  // Fill in blank fields
  sentence_with_blank?: string;
  correct_answers?: string[];
  context_hint?: string;

  // Common fields
  rationale: string;
  passage_evidence?: string;
  passage_location?: string;
  chunk_start_index?: number;
  chunk_end_index?: number;

  created: string;
}

// User's answer attempt
export interface QuestionAttempt {
  id: string;
  question: string;
  user_answer?: string;
  is_correct?: boolean;
  time_spent_ms?: number;

  // FSRS fields (set by hook)
  rating?: 1 | 2 | 3 | 4;
  stability: number;
  difficulty: number;
  due_at?: string;
  state: 0 | 1 | 2 | 3; // New, Learning, Review, Relearning
  reps: number;
  lapses: number;

  created: string;
}

// Session milestone
export interface SessionMilestone {
  id: string;
  session: string;
  milestone_percent: 25 | 50 | 75 | 100;
  quiz_prompted: boolean;
  quiz_completed: boolean;
  created: string;
}

// Connection status
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Expanded types for API responses with relations
export interface SessionWithDocument extends ReadingSession {
  expand?: {
    document: ComprehensionDocument;
  };
}

// Input types for creating records
export interface CreateDocumentInput {
  title: string;
  content: string;
  source_type: 'paste' | 'file' | 'url';
  source_path?: string;
  file_type?: 'txt' | 'md' | 'pdf';
  word_count: number;
}

export interface CreateSessionInput {
  document: string;
  total_words: number;
  wpm_setting?: number;
  chunk_size?: number;
}

export interface UpdateSessionInput {
  current_word_index?: number;
  progress_percent?: number;
  wpm_setting?: number;
  is_active?: boolean;
  completed_at?: string;
}

// FSRS rating descriptions for UI
export const FSRS_RATINGS = {
  1: { label: 'Again', description: 'Forgot completely' },
  2: { label: 'Hard', description: 'Struggled to recall' },
  3: { label: 'Good', description: 'Recalled with effort' },
  4: { label: 'Easy', description: 'Instant recall' },
} as const;

// Quiz state for managing active quiz session
export interface QuizState {
  questions: Question[];
  currentIndex: number;
  answers: Map<string, { answer: string; isCorrect: boolean; rating?: number }>;
  isGenerating: boolean;
  error?: string;
}
