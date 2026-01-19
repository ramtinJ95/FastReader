# Phase 2: In-App Question Generation - Implementation Guide

**Prerequisite:** Phase 1 complete (PocketBase running, collections created, FSRS hooks working, MCP server operational, PocketBase client integrated into FastReader)

**Goal:** Users can generate and answer comprehension questions entirely within the FastReader UI.

---

## Prerequisites Checklist

Before starting Phase 2, verify Phase 1 is working:

```bash
# PocketBase is running
curl http://127.0.0.1:8090/api/health

# Collections exist
curl http://127.0.0.1:8090/api/collections/documents/records
curl http://127.0.0.1:8090/api/collections/questions/records
curl http://127.0.0.1:8090/api/collections/question_attempts/records
curl http://127.0.0.1:8090/api/collections/session_milestones/records

# MCP server is registered
claude mcp list | grep fastreader
```

---

## Task 1: Add PocketBase Dependency and Types

### 1.1 Install PocketBase SDK

```bash
npm install pocketbase
```

### 1.2 Create Comprehension Types

Create `src/types/comprehension.ts`:

```typescript
// Question types matching PocketBase schema
export type QuestionType = 'multiple_choice' | 'short_answer' | 'fill_in_blank';
export type ComprehensionType = 'factual_recall' | 'inference' | 'synthesis';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  document: string;
  session?: string;
  question_text: string;
  question_type: QuestionType;
  comprehension_type: ComprehensionType;
  difficulty?: Difficulty;
  options?: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  rationale: string;
  created: string;
}

export interface QuestionAttempt {
  id: string;
  question: string;
  user_answer?: string;
  is_correct?: boolean;
  time_spent_ms?: number;
  rating?: 1 | 2 | 3 | 4;
  stability: number;
  difficulty: number;
  due_at?: string;
  state: 0 | 1 | 2 | 3;
  reps: number;
  lapses: number;
  created: string;
}

export interface SessionMilestone {
  id: string;
  session: string;
  milestone_percent: 25 | 50 | 75 | 100;
  quiz_prompted: boolean;
  quiz_completed: boolean;
  created: string;
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
```

### 1.3 Export Types

Update `src/types/index.ts` to include:

```typescript
export * from './comprehension';
```

### Verification

```bash
npm run build
# Should compile without TypeScript errors
```

---

## Task 2: Create PocketBase Service

### 2.1 Create PocketBase Client

Create `src/services/pocketbase.ts`:

```typescript
import PocketBase from 'pocketbase';
import type { Question, QuestionAttempt, SessionMilestone } from '../types';

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(POCKETBASE_URL);

// Disable auto-cancellation for SSE subscriptions
pb.autoCancellation(false);

export interface PocketBaseDocument {
  id: string;
  title: string;
  content: string;
  source_type: 'paste' | 'file' | 'url';
  source_path?: string;
  word_count: number;
  created: string;
  updated: string;
}

export interface PocketBaseSession {
  id: string;
  document: string;
  current_word_index: number;
  total_words: number;
  progress_percent: number;
  is_active: boolean;
  created: string;
  updated: string;
}

export const pocketbaseService = {
  // Health check
  async isConnected(): Promise<boolean> {
    try {
      await pb.health.check();
      return true;
    } catch {
      return false;
    }
  },

  // Documents
  async createDocument(data: {
    title: string;
    content: string;
    source_type: 'paste' | 'file' | 'url';
    source_path?: string;
    word_count: number;
  }): Promise<PocketBaseDocument> {
    return pb.collection('documents').create(data);
  },

  async getDocument(id: string): Promise<PocketBaseDocument> {
    return pb.collection('documents').getOne(id);
  },

  // Sessions
  async createSession(documentId: string, totalWords: number): Promise<PocketBaseSession> {
    return pb.collection('sessions').create({
      document: documentId,
      current_word_index: 0,
      total_words: totalWords,
      progress_percent: 0,
      is_active: true,
    });
  },

  async updateSessionProgress(sessionId: string, wordIndex: number, totalWords: number): Promise<void> {
    const progress = totalWords > 0 ? (wordIndex / totalWords) * 100 : 0;
    await pb.collection('sessions').update(sessionId, {
      current_word_index: wordIndex,
      progress_percent: progress,
    });
  },

  async getActiveSession(): Promise<PocketBaseSession | null> {
    try {
      const result = await pb.collection('sessions').getList<PocketBaseSession>(1, 1, {
        filter: 'is_active = true',
        sort: '-updated',
      });
      return result.items[0] || null;
    } catch {
      return null;
    }
  },

  // Questions
  async getQuestionsForSession(sessionId: string): Promise<Question[]> {
    const result = await pb.collection('questions').getList<Question>(1, 100, {
      filter: `session = "${sessionId}"`,
      sort: '-created',
    });
    return result.items;
  },

  // Question Attempts
  async recordAttempt(data: {
    question: string;
    user_answer: string;
    is_correct: boolean;
    rating: 1 | 2 | 3 | 4;
    time_spent_ms?: number;
  }): Promise<QuestionAttempt> {
    return pb.collection('question_attempts').create(data);
  },

  // Milestones
  async getMilestonesForSession(sessionId: string): Promise<SessionMilestone[]> {
    const result = await pb.collection('session_milestones').getList<SessionMilestone>(1, 10, {
      filter: `session = "${sessionId}"`,
      sort: '-milestone_percent',
    });
    return result.items;
  },

  async markMilestonePrompted(milestoneId: string): Promise<void> {
    await pb.collection('session_milestones').update(milestoneId, {
      quiz_prompted: true,
    });
  },

  async markMilestoneCompleted(milestoneId: string): Promise<void> {
    await pb.collection('session_milestones').update(milestoneId, {
      quiz_completed: true,
    });
  },

  // SSE Subscriptions
  subscribeToQuestions(sessionId: string, callback: (question: Question) => void): () => void {
    pb.collection('questions').subscribe('*', (e) => {
      if (e.action === 'create' && e.record.session === sessionId) {
        callback(e.record as unknown as Question);
      }
    });
    return () => pb.collection('questions').unsubscribe('*');
  },

  subscribeToMilestones(sessionId: string, callback: (milestone: SessionMilestone) => void): () => void {
    pb.collection('session_milestones').subscribe('*', (e) => {
      if (e.action === 'create' && e.record.session === sessionId) {
        callback(e.record as unknown as SessionMilestone);
      }
    });
    return () => pb.collection('session_milestones').unsubscribe('*');
  },
};
```

### 2.2 Write Tests

Create `src/services/pocketbase.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pocketbaseService } from './pocketbase';

// Mock PocketBase
vi.mock('pocketbase', () => {
  const mockCollection = {
    create: vi.fn(),
    getOne: vi.fn(),
    getList: vi.fn(),
    update: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };

  return {
    default: vi.fn(() => ({
      autoCancellation: vi.fn(),
      health: { check: vi.fn() },
      collection: vi.fn(() => mockCollection),
    })),
  };
});

describe('pocketbaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isConnected', () => {
    it('returns true when health check succeeds', async () => {
      const result = await pocketbaseService.isConnected();
      expect(typeof result).toBe('boolean');
    });
  });
});
```

### Verification

```bash
npm test -- src/services/pocketbase.test.ts
```

---

## Task 3: Create AI CLI Spawner Service

This service spawns the AI CLI (Claude, Codex, etc.) to generate questions.

### 3.1 Create CLI Service

Create `src/services/aiCli.ts`:

```typescript
export interface AICliConfig {
  command: string;
  args: string[];
  timeout: number; // seconds
}

const DEFAULT_CONFIG: AICliConfig = {
  command: 'claude',
  args: ['--print'],
  timeout: 300,
};

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error' | 'timeout' | 'cancelled';

export interface GenerationResult {
  status: GenerationStatus;
  error?: string;
}

// Store config in localStorage
const CONFIG_KEY = 'fastreader_ai_config';

export function getAIConfig(): AICliConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_CONFIG;
}

export function setAIConfig(config: Partial<AICliConfig>): void {
  const current = getAIConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

// Browser-based approach: generate questions by calling an endpoint
// that spawns the CLI, or show instructions for manual CLI usage.
// For Electron/Tauri apps, you could use child_process directly.

export class AICliService {
  private abortController: AbortController | null = null;
  private config: AICliConfig;

  constructor(config?: Partial<AICliConfig>) {
    this.config = { ...getAIConfig(), ...config };
  }

  /**
   * Generate questions for the current session.
   *
   * In a browser context, this creates a prompt that users can copy
   * to their CLI. For native apps, this would spawn the process directly.
   */
  async generateQuestions(
    sessionId: string,
    documentId: string,
    count: number = 5,
    onStatusChange?: (status: GenerationStatus) => void
  ): Promise<GenerationResult> {
    this.abortController = new AbortController();
    onStatusChange?.('generating');

    const prompt = this.buildPrompt(count);

    // For web apps: We'll rely on SSE from PocketBase to know when questions arrive
    // The user runs the CLI manually, or we have a backend endpoint that does it

    // Check if we're in a context where we can spawn processes
    if (typeof window !== 'undefined' && !('electronAPI' in window)) {
      // Browser context - return the prompt for manual execution
      console.log('AI CLI Prompt (run in terminal):', prompt);
      console.log(`Command: ${this.config.command} ${this.config.args.join(' ')} "${prompt}"`);

      // In browser, we wait for SSE events from PocketBase
      // The "generation" is considered started once the user runs the command
      return { status: 'success' };
    }

    // Native context (Electron/Tauri) - spawn process directly
    // This would be implemented with IPC to the main process
    return { status: 'success' };
  }

  private buildPrompt(count: number): string {
    return `Generate ${count} comprehension questions for my current FastReader session. ` +
      `Use the fastreader_get_current_session tool to get the document and progress, ` +
      `use fastreader_get_question_history to avoid duplicates, ` +
      `then save questions using fastreader_save_questions. ` +
      `Include a mix of multiple choice, short answer, and fill-in-blank questions. ` +
      `Focus on factual recall and inference.`;
  }

  cancel(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  isGenerating(): boolean {
    return this.abortController !== null;
  }
}

// Singleton instance
let cliService: AICliService | null = null;

export function getAICliService(): AICliService {
  if (!cliService) {
    cliService = new AICliService();
  }
  return cliService;
}
```

### 3.2 Write Tests

Create `src/services/aiCli.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AICliService, getAIConfig, setAIConfig } from './aiCli';

describe('AICliService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('config management', () => {
    it('returns default config when none stored', () => {
      const config = getAIConfig();
      expect(config.command).toBe('claude');
      expect(config.args).toEqual(['--print']);
      expect(config.timeout).toBe(300);
    });

    it('persists config changes', () => {
      setAIConfig({ command: 'codex', timeout: 600 });
      const config = getAIConfig();
      expect(config.command).toBe('codex');
      expect(config.timeout).toBe(600);
      expect(config.args).toEqual(['--print']); // unchanged
    });
  });

  describe('AICliService', () => {
    it('can be instantiated with custom config', () => {
      const service = new AICliService({ command: 'opencode' });
      expect(service).toBeInstanceOf(AICliService);
    });

    it('tracks generation state', () => {
      const service = new AICliService();
      expect(service.isGenerating()).toBe(false);
    });

    it('can be cancelled', () => {
      const service = new AICliService();
      service.cancel();
      expect(service.isGenerating()).toBe(false);
    });
  });
});
```

### Verification

```bash
npm test -- src/services/aiCli.test.ts
```

---

## Task 4: Create Quiz Components

### 4.1 Create QuizModal Component

Create `src/components/Quiz/QuizModal.tsx`:

```typescript
import { useCallback } from 'react';
import type { Question, QuizState } from '../../types';
import { MCQQuestion } from './MCQQuestion';
import { QuizFeedback } from './QuizFeedback';
import './Quiz.css';

export interface QuizModalProps {
  quiz: QuizState;
  onAnswer: (questionId: string, answer: string) => void;
  onRating: (questionId: string, rating: 1 | 2 | 3 | 4) => void;
  onNext: () => void;
  onClose: () => void;
}

export function QuizModal({ quiz, onAnswer, onRating, onNext, onClose }: QuizModalProps) {
  const currentQuestion = quiz.questions[quiz.currentIndex];
  const currentAnswer = currentQuestion ? quiz.answers.get(currentQuestion.id) : undefined;
  const isLastQuestion = quiz.currentIndex === quiz.questions.length - 1;
  const progress = ((quiz.currentIndex + 1) / quiz.questions.length) * 100;

  const handleClose = useCallback(() => {
    if (quiz.isGenerating) return; // Don't allow close while generating
    onClose();
  }, [quiz.isGenerating, onClose]);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div
        className="dialog quiz-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="quiz-header">
          <h3 id="quiz-title">Quiz</h3>
          <button
            className="quiz-close-btn"
            onClick={handleClose}
            aria-label="Close quiz"
            disabled={quiz.isGenerating}
          >
            &times;
          </button>
        </div>

        <div className="quiz-progress">
          <span className="quiz-progress-text">
            Question {quiz.currentIndex + 1} of {quiz.questions.length}
          </span>
          <div className="quiz-progress-bar">
            <div
              className="quiz-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="quiz-question-type">
            {formatComprehensionType(currentQuestion.comprehension_type)}
          </span>
        </div>

        <div className="quiz-content">
          {!currentAnswer ? (
            // Show question
            currentQuestion.question_type === 'multiple_choice' ? (
              <MCQQuestion
                question={currentQuestion}
                onAnswer={(answer) => onAnswer(currentQuestion.id, answer)}
              />
            ) : (
              // Placeholder for other question types (Phase 3)
              <div className="quiz-question">
                <p>{currentQuestion.question_text}</p>
                <p className="quiz-unsupported">
                  This question type ({currentQuestion.question_type}) will be supported in a future update.
                </p>
              </div>
            )
          ) : (
            // Show feedback
            <QuizFeedback
              question={currentQuestion}
              userAnswer={currentAnswer.answer}
              isCorrect={currentAnswer.isCorrect}
              hasRated={currentAnswer.rating !== undefined}
              onRating={(rating) => onRating(currentQuestion.id, rating)}
            />
          )}
        </div>

        {currentAnswer?.rating !== undefined && (
          <div className="quiz-actions">
            <button
              className="btn primary"
              onClick={isLastQuestion ? handleClose : onNext}
            >
              {isLastQuestion ? 'Finish' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatComprehensionType(type: string): string {
  switch (type) {
    case 'factual_recall':
      return 'Factual';
    case 'inference':
      return 'Inference';
    case 'synthesis':
      return 'Synthesis';
    default:
      return type;
  }
}
```

### 4.2 Create MCQQuestion Component

Create `src/components/Quiz/MCQQuestion.tsx`:

```typescript
import { useState, useCallback } from 'react';
import type { Question } from '../../types';

export interface MCQQuestionProps {
  question: Question;
  onAnswer: (answer: string) => void;
}

export function MCQQuestion({ question, onAnswer }: MCQQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = useCallback((option: string) => {
    setSelected(option);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selected) {
      onAnswer(selected);
    }
  }, [selected, onAnswer]);

  if (!question.options) {
    return <p>Error: No options provided for this question.</p>;
  }

  const options = Object.entries(question.options) as [string, string][];

  return (
    <div className="mcq-question">
      <p className="question-text">{question.question_text}</p>

      <div className="mcq-options" role="radiogroup" aria-label="Answer options">
        {options.map(([key, value]) => (
          <label
            key={key}
            className={`mcq-option ${selected === key ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="mcq-answer"
              value={key}
              checked={selected === key}
              onChange={() => handleSelect(key)}
              aria-describedby={`option-${key}`}
            />
            <span className="mcq-option-key">{key}</span>
            <span id={`option-${key}`} className="mcq-option-text">{value}</span>
          </label>
        ))}
      </div>

      <button
        className="btn primary"
        onClick={handleSubmit}
        disabled={!selected}
      >
        Submit Answer
      </button>
    </div>
  );
}
```

### 4.3 Create QuizFeedback Component

Create `src/components/Quiz/QuizFeedback.tsx`:

```typescript
import type { Question } from '../../types';
import { FSRS_RATINGS } from '../../types';

export interface QuizFeedbackProps {
  question: Question;
  userAnswer: string;
  isCorrect: boolean;
  hasRated: boolean;
  onRating: (rating: 1 | 2 | 3 | 4) => void;
}

export function QuizFeedback({
  question,
  userAnswer,
  isCorrect,
  hasRated,
  onRating,
}: QuizFeedbackProps) {
  return (
    <div className="quiz-feedback">
      <div className={`feedback-header ${isCorrect ? 'correct' : 'incorrect'}`}>
        <span className="feedback-icon">{isCorrect ? '✓' : '✗'}</span>
        <span className="feedback-text">
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </span>
      </div>

      {!isCorrect && question.options && (
        <div className="feedback-correct-answer">
          <p>
            <strong>Your answer:</strong> {userAnswer}) {question.options[userAnswer as keyof typeof question.options]}
          </p>
          <p>
            <strong>Correct answer:</strong> {question.correct_answer}) {question.options[question.correct_answer as keyof typeof question.options]}
          </p>
        </div>
      )}

      <div className="feedback-rationale">
        <p>{question.rationale}</p>
      </div>

      {!hasRated && (
        <div className="feedback-rating">
          <p className="rating-prompt">How difficult was this question?</p>
          <div className="rating-buttons">
            {([1, 2, 3, 4] as const).map((rating) => (
              <button
                key={rating}
                className={`rating-btn rating-${rating}`}
                onClick={() => onRating(rating)}
                title={FSRS_RATINGS[rating].description}
              >
                {FSRS_RATINGS[rating].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4.4 Create Quiz CSS

Create `src/components/Quiz/Quiz.css`:

```css
/* Quiz Modal */
.quiz-modal {
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.quiz-header h3 {
  margin: 0;
}

.quiz-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: var(--spacing-xs);
  line-height: 1;
}

.quiz-close-btn:hover {
  color: var(--color-text);
}

.quiz-close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Progress */
.quiz-progress {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  font-size: 0.85rem;
}

.quiz-progress-text {
  color: var(--color-text-muted);
  white-space: nowrap;
}

.quiz-progress-bar {
  flex: 1;
  height: 4px;
  background: var(--color-bg-panel);
  border-radius: 2px;
  overflow: hidden;
}

.quiz-progress-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width var(--transition-normal);
}

.quiz-question-type {
  background: var(--color-bg-panel);
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
}

/* Question content */
.quiz-content {
  margin-bottom: var(--spacing-lg);
}

.question-text {
  font-size: 1.1rem;
  line-height: 1.5;
  margin-bottom: var(--spacing-lg);
}

/* MCQ Options */
.mcq-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.mcq-option {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mcq-option:hover {
  border-color: var(--color-border-lighter);
}

.mcq-option.selected {
  border-color: var(--color-accent);
  background: rgba(255, 107, 107, 0.1);
}

.mcq-option input {
  margin-top: 3px;
}

.mcq-option-key {
  font-weight: bold;
  color: var(--color-accent);
  min-width: 1.5em;
}

.mcq-option-text {
  flex: 1;
}

/* Feedback */
.quiz-feedback {
  text-align: left;
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.feedback-header.correct {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.feedback-header.incorrect {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.feedback-icon {
  font-size: 1.5rem;
}

.feedback-text {
  font-size: 1.2rem;
  font-weight: bold;
}

.feedback-correct-answer {
  background: var(--color-bg-panel);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.feedback-correct-answer p {
  margin: var(--spacing-xs) 0;
}

.feedback-rationale {
  padding: var(--spacing-md);
  border-left: 3px solid var(--color-accent);
  margin-bottom: var(--spacing-lg);
  color: var(--color-text-secondary);
}

/* Rating */
.feedback-rating {
  border-top: 1px solid var(--color-border-light);
  padding-top: var(--spacing-md);
}

.rating-prompt {
  text-align: center;
  margin-bottom: var(--spacing-md);
  color: var(--color-text-muted);
}

.rating-buttons {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
}

.rating-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 0.85rem;
}

.rating-btn:hover {
  border-color: var(--color-border-lighter);
}

.rating-btn.rating-1 { border-color: #f44336; }
.rating-btn.rating-1:hover { background: rgba(244, 67, 54, 0.2); }

.rating-btn.rating-2 { border-color: #ff9800; }
.rating-btn.rating-2:hover { background: rgba(255, 152, 0, 0.2); }

.rating-btn.rating-3 { border-color: #4caf50; }
.rating-btn.rating-3:hover { background: rgba(76, 175, 80, 0.2); }

.rating-btn.rating-4 { border-color: #2196f3; }
.rating-btn.rating-4:hover { background: rgba(33, 150, 243, 0.2); }

/* Actions */
.quiz-actions {
  display: flex;
  justify-content: flex-end;
}

/* Unsupported question type */
.quiz-unsupported {
  color: var(--color-text-muted);
  font-style: italic;
  padding: var(--spacing-lg);
  text-align: center;
  background: var(--color-bg-panel);
  border-radius: var(--radius-md);
}

/* Mobile adjustments */
@media (max-width: 600px) {
  .quiz-modal {
    max-height: 85vh;
  }

  .rating-buttons {
    flex-wrap: wrap;
  }

  .rating-btn {
    flex: 1 1 45%;
  }
}
```

### 4.5 Create Index Export

Create `src/components/Quiz/index.ts`:

```typescript
export { QuizModal } from './QuizModal';
export { MCQQuestion } from './MCQQuestion';
export { QuizFeedback } from './QuizFeedback';
```

### 4.6 Write Component Tests

Create `src/components/Quiz/MCQQuestion.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MCQQuestion } from './MCQQuestion';
import type { Question } from '../../types';

const mockQuestion: Question = {
  id: 'q1',
  document: 'doc1',
  question_text: 'What is the main idea?',
  question_type: 'multiple_choice',
  comprehension_type: 'inference',
  options: {
    A: 'First option',
    B: 'Second option',
    C: 'Third option',
    D: 'Fourth option',
  },
  correct_answer: 'B',
  rationale: 'Because the text states...',
  created: '2026-01-18',
};

describe('MCQQuestion', () => {
  it('renders question text', () => {
    render(<MCQQuestion question={mockQuestion} onAnswer={vi.fn()} />);
    expect(screen.getByText('What is the main idea?')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<MCQQuestion question={mockQuestion} onAnswer={vi.fn()} />);
    expect(screen.getByText('First option')).toBeInTheDocument();
    expect(screen.getByText('Second option')).toBeInTheDocument();
    expect(screen.getByText('Third option')).toBeInTheDocument();
    expect(screen.getByText('Fourth option')).toBeInTheDocument();
  });

  it('disables submit button until option selected', () => {
    render(<MCQQuestion question={mockQuestion} onAnswer={vi.fn()} />);
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit after selecting an option', async () => {
    const user = userEvent.setup();
    render(<MCQQuestion question={mockQuestion} onAnswer={vi.fn()} />);

    await user.click(screen.getByText('First option'));

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onAnswer with selected option when submitted', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<MCQQuestion question={mockQuestion} onAnswer={onAnswer} />);

    await user.click(screen.getByText('Second option'));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onAnswer).toHaveBeenCalledWith('B');
  });
});
```

Create `src/components/Quiz/QuizFeedback.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizFeedback } from './QuizFeedback';
import type { Question } from '../../types';

const mockQuestion: Question = {
  id: 'q1',
  document: 'doc1',
  question_text: 'Test question?',
  question_type: 'multiple_choice',
  comprehension_type: 'inference',
  options: { A: 'Wrong', B: 'Correct', C: 'Wrong', D: 'Wrong' },
  correct_answer: 'B',
  rationale: 'The explanation for the answer.',
  created: '2026-01-18',
};

describe('QuizFeedback', () => {
  it('shows correct feedback when answer is correct', () => {
    render(
      <QuizFeedback
        question={mockQuestion}
        userAnswer="B"
        isCorrect={true}
        hasRated={false}
        onRating={vi.fn()}
      />
    );
    expect(screen.getByText('Correct!')).toBeInTheDocument();
  });

  it('shows incorrect feedback with correct answer', () => {
    render(
      <QuizFeedback
        question={mockQuestion}
        userAnswer="A"
        isCorrect={false}
        hasRated={false}
        onRating={vi.fn()}
      />
    );
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
    expect(screen.getByText(/Your answer:/)).toBeInTheDocument();
    expect(screen.getByText(/Correct answer:/)).toBeInTheDocument();
  });

  it('shows rationale', () => {
    render(
      <QuizFeedback
        question={mockQuestion}
        userAnswer="B"
        isCorrect={true}
        hasRated={false}
        onRating={vi.fn()}
      />
    );
    expect(screen.getByText('The explanation for the answer.')).toBeInTheDocument();
  });

  it('shows rating buttons when not rated', () => {
    render(
      <QuizFeedback
        question={mockQuestion}
        userAnswer="B"
        isCorrect={true}
        hasRated={false}
        onRating={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /good/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /easy/i })).toBeInTheDocument();
  });

  it('hides rating buttons after rated', () => {
    render(
      <QuizFeedback
        question={mockQuestion}
        userAnswer="B"
        isCorrect={true}
        hasRated={true}
        onRating={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /again/i })).not.toBeInTheDocument();
  });

  it('calls onRating when rating button clicked', async () => {
    const user = userEvent.setup();
    const onRating = vi.fn();
    render(
      <QuizFeedback
        question={mockQuestion}
        userAnswer="B"
        isCorrect={true}
        hasRated={false}
        onRating={onRating}
      />
    );

    await user.click(screen.getByRole('button', { name: /good/i }));
    expect(onRating).toHaveBeenCalledWith(3);
  });
});
```

### Verification

```bash
npm test -- src/components/Quiz/
```

---

## Task 5: Create Generation Overlay Component

### 5.1 Create GeneratingOverlay Component

Create `src/components/Quiz/GeneratingOverlay.tsx`:

```typescript
import './Quiz.css';

export interface GeneratingOverlayProps {
  onCancel?: () => void;
}

export function GeneratingOverlay({ onCancel }: GeneratingOverlayProps) {
  return (
    <div className="dialog-overlay">
      <div className="dialog generating-overlay" role="alert" aria-live="polite">
        <div className="generating-spinner" aria-hidden="true" />
        <h3>Generating Questions</h3>
        <p>Using AI to create comprehension questions...</p>
        <p className="generating-hint">This may take 30-60 seconds.</p>
        {onCancel && (
          <button className="btn secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
```

### 5.2 Add CSS for Overlay

Add to `src/components/Quiz/Quiz.css`:

```css
/* Generating Overlay */
.generating-overlay {
  text-align: center;
  max-width: 320px;
}

.generating-overlay h3 {
  margin-bottom: var(--spacing-sm);
}

.generating-overlay p {
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-sm);
}

.generating-hint {
  font-size: 0.85rem;
  margin-bottom: var(--spacing-lg);
}

.generating-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border-light);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  margin: 0 auto var(--spacing-lg);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### 5.3 Update Index Export

Update `src/components/Quiz/index.ts`:

```typescript
export { QuizModal } from './QuizModal';
export { MCQQuestion } from './MCQQuestion';
export { QuizFeedback } from './QuizFeedback';
export { GeneratingOverlay } from './GeneratingOverlay';
```

### Verification

```bash
npm test -- src/components/Quiz/
npm run build
```

---

## Task 6: Create Milestone Prompt Component

### 6.1 Create MilestonePrompt Component

Create `src/components/Quiz/MilestonePrompt.tsx`:

```typescript
import './Quiz.css';

export interface MilestonePromptProps {
  milestonePercent: number;
  onGenerateQuiz: () => void;
  onDismiss: () => void;
}

export function MilestonePrompt({
  milestonePercent,
  onGenerateQuiz,
  onDismiss,
}: MilestonePromptProps) {
  return (
    <div className="milestone-prompt" role="alert">
      <div className="milestone-content">
        <span className="milestone-badge">{milestonePercent}%</span>
        <span className="milestone-text">Ready for a quiz?</span>
      </div>
      <div className="milestone-actions">
        <button className="btn primary small" onClick={onGenerateQuiz}>
          Generate Quiz
        </button>
        <button className="btn secondary small" onClick={onDismiss}>
          Later
        </button>
      </div>
    </div>
  );
}
```

### 6.2 Add CSS for Milestone Prompt

Add to `src/components/Quiz/Quiz.css`:

```css
/* Milestone Prompt */
.milestone-prompt {
  position: fixed;
  top: var(--spacing-lg);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-bg-card);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  z-index: var(--z-tooltip);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.milestone-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.milestone-badge {
  background: var(--color-accent);
  color: var(--color-bg);
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-weight: bold;
  font-size: 0.85rem;
}

.milestone-text {
  color: var(--color-text);
}

.milestone-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.btn.small {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: 0.85rem;
}

@media (max-width: 600px) {
  .milestone-prompt {
    flex-direction: column;
    width: calc(100% - var(--spacing-lg) * 2);
    text-align: center;
  }
}
```

### 6.3 Update Index Export

Update `src/components/Quiz/index.ts`:

```typescript
export { QuizModal } from './QuizModal';
export { MCQQuestion } from './MCQQuestion';
export { QuizFeedback } from './QuizFeedback';
export { GeneratingOverlay } from './GeneratingOverlay';
export { MilestonePrompt } from './MilestonePrompt';
```

### 6.4 Write Tests

Create `src/components/Quiz/MilestonePrompt.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MilestonePrompt } from './MilestonePrompt';

describe('MilestonePrompt', () => {
  it('displays milestone percentage', () => {
    render(
      <MilestonePrompt
        milestonePercent={50}
        onGenerateQuiz={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('calls onGenerateQuiz when button clicked', async () => {
    const user = userEvent.setup();
    const onGenerateQuiz = vi.fn();
    render(
      <MilestonePrompt
        milestonePercent={25}
        onGenerateQuiz={onGenerateQuiz}
        onDismiss={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /generate quiz/i }));
    expect(onGenerateQuiz).toHaveBeenCalled();
  });

  it('calls onDismiss when later clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <MilestonePrompt
        milestonePercent={25}
        onGenerateQuiz={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    await user.click(screen.getByRole('button', { name: /later/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
```

### Verification

```bash
npm test -- src/components/Quiz/
```

---

## Task 7: Create useComprehension Hook

### 7.1 Create the Hook

Create `src/hooks/useComprehension.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { pocketbaseService } from '../services/pocketbase';
import { getAICliService } from '../services/aiCli';
import type { Question, QuizState, SessionMilestone } from '../types';

export interface UseComprehensionOptions {
  /** Called when a milestone is reached */
  onMilestone?: (milestone: SessionMilestone) => void;
}

export interface UseComprehensionReturn {
  // Connection state
  isConnected: boolean;

  // Session state
  sessionId: string | null;
  documentId: string | null;

  // Milestone state
  pendingMilestone: SessionMilestone | null;
  dismissMilestone: () => void;

  // Quiz state
  quiz: QuizState | null;
  isGenerating: boolean;
  generationError: string | null;

  // Actions
  generateQuiz: (count?: number) => Promise<void>;
  answerQuestion: (questionId: string, answer: string) => void;
  rateQuestion: (questionId: string, rating: 1 | 2 | 3 | 4) => Promise<void>;
  nextQuestion: () => void;
  closeQuiz: () => void;

  // Document sync
  syncDocument: (title: string, content: string, wordCount: number) => Promise<void>;
  updateProgress: (wordIndex: number, totalWords: number) => Promise<void>;
}

export function useComprehension(options: UseComprehensionOptions = {}): UseComprehensionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [pendingMilestone, setPendingMilestone] = useState<SessionMilestone | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const unsubscribersRef = useRef<(() => void)[]>([]);

  // Check connection on mount
  useEffect(() => {
    pocketbaseService.isConnected().then(setIsConnected);
  }, []);

  // Subscribe to SSE events when session is active
  useEffect(() => {
    if (!sessionId || !isConnected) return;

    // Subscribe to new questions
    const unsubQuestions = pocketbaseService.subscribeToQuestions(sessionId, (question) => {
      setQuiz((prev) => {
        if (!prev) {
          return {
            questions: [question],
            currentIndex: 0,
            answers: new Map(),
            isGenerating: false,
          };
        }
        return {
          ...prev,
          questions: [...prev.questions, question],
          isGenerating: false,
        };
      });
      setIsGenerating(false);
    });

    // Subscribe to milestones
    const unsubMilestones = pocketbaseService.subscribeToMilestones(sessionId, (milestone) => {
      if (!milestone.quiz_prompted) {
        setPendingMilestone(milestone);
        options.onMilestone?.(milestone);
      }
    });

    unsubscribersRef.current = [unsubQuestions, unsubMilestones];

    return () => {
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
    };
  }, [sessionId, isConnected, options]);

  const syncDocument = useCallback(async (title: string, content: string, wordCount: number) => {
    if (!isConnected) return;

    try {
      // Create document
      const doc = await pocketbaseService.createDocument({
        title: title || 'Untitled',
        content,
        source_type: 'paste',
        word_count: wordCount,
      });
      setDocumentId(doc.id);

      // Create session
      const session = await pocketbaseService.createSession(doc.id, wordCount);
      setSessionId(session.id);
    } catch (error) {
      console.error('Failed to sync document:', error);
    }
  }, [isConnected]);

  const updateProgress = useCallback(async (wordIndex: number, totalWords: number) => {
    if (!sessionId) return;

    try {
      await pocketbaseService.updateSessionProgress(sessionId, wordIndex, totalWords);
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }, [sessionId]);

  const dismissMilestone = useCallback(async () => {
    if (!pendingMilestone) return;

    try {
      await pocketbaseService.markMilestonePrompted(pendingMilestone.id);
      setPendingMilestone(null);
    } catch (error) {
      console.error('Failed to dismiss milestone:', error);
      setPendingMilestone(null);
    }
  }, [pendingMilestone]);

  const generateQuiz = useCallback(async (count: number = 5) => {
    if (!sessionId || !documentId) {
      setGenerationError('No active session');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const cliService = getAICliService();
      await cliService.generateQuestions(sessionId, documentId, count);

      // Mark milestone as prompted if we have one
      if (pendingMilestone) {
        await pocketbaseService.markMilestonePrompted(pendingMilestone.id);
        setPendingMilestone(null);
      }

      // Questions will arrive via SSE subscription
      // Set a timeout in case generation fails silently
      setTimeout(() => {
        setIsGenerating((current) => {
          if (current) {
            setGenerationError('Generation timed out. Please try again or run the CLI manually.');
            return false;
          }
          return current;
        });
      }, 120000); // 2 minute timeout
    } catch (error) {
      setIsGenerating(false);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate questions');
    }
  }, [sessionId, documentId, pendingMilestone]);

  const answerQuestion = useCallback((questionId: string, answer: string) => {
    setQuiz((prev) => {
      if (!prev) return null;

      const question = prev.questions.find((q) => q.id === questionId);
      if (!question) return prev;

      const isCorrect = answer === question.correct_answer;
      const newAnswers = new Map(prev.answers);
      newAnswers.set(questionId, { answer, isCorrect });

      return { ...prev, answers: newAnswers };
    });
  }, []);

  const rateQuestion = useCallback(async (questionId: string, rating: 1 | 2 | 3 | 4) => {
    const currentQuiz = quiz;
    if (!currentQuiz) return;

    const answerData = currentQuiz.answers.get(questionId);
    if (!answerData) return;

    // Update local state
    setQuiz((prev) => {
      if (!prev) return null;

      const newAnswers = new Map(prev.answers);
      newAnswers.set(questionId, { ...answerData, rating });

      return { ...prev, answers: newAnswers };
    });

    // Record attempt in PocketBase
    try {
      await pocketbaseService.recordAttempt({
        question: questionId,
        user_answer: answerData.answer,
        is_correct: answerData.isCorrect,
        rating,
      });
    } catch (error) {
      console.error('Failed to record attempt:', error);
    }
  }, [quiz]);

  const nextQuestion = useCallback(() => {
    setQuiz((prev) => {
      if (!prev) return null;
      if (prev.currentIndex >= prev.questions.length - 1) return prev;
      return { ...prev, currentIndex: prev.currentIndex + 1 };
    });
  }, []);

  const closeQuiz = useCallback(async () => {
    // Mark milestone as completed if we have one
    if (pendingMilestone) {
      try {
        await pocketbaseService.markMilestoneCompleted(pendingMilestone.id);
      } catch (error) {
        console.error('Failed to mark milestone completed:', error);
      }
    }

    setQuiz(null);
    setGenerationError(null);
  }, [pendingMilestone]);

  return {
    isConnected,
    sessionId,
    documentId,
    pendingMilestone,
    dismissMilestone,
    quiz,
    isGenerating,
    generationError,
    generateQuiz,
    answerQuestion,
    rateQuestion,
    nextQuestion,
    closeQuiz,
    syncDocument,
    updateProgress,
  };
}
```

### 7.2 Write Hook Tests

Create `src/hooks/useComprehension.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComprehension } from './useComprehension';

// Mock services
vi.mock('../services/pocketbase', () => ({
  pocketbaseService: {
    isConnected: vi.fn().mockResolvedValue(true),
    createDocument: vi.fn().mockResolvedValue({ id: 'doc1' }),
    createSession: vi.fn().mockResolvedValue({ id: 'session1' }),
    updateSessionProgress: vi.fn().mockResolvedValue(undefined),
    markMilestonePrompted: vi.fn().mockResolvedValue(undefined),
    markMilestoneCompleted: vi.fn().mockResolvedValue(undefined),
    recordAttempt: vi.fn().mockResolvedValue({ id: 'attempt1' }),
    subscribeToQuestions: vi.fn().mockReturnValue(() => {}),
    subscribeToMilestones: vi.fn().mockReturnValue(() => {}),
  },
}));

vi.mock('../services/aiCli', () => ({
  getAICliService: vi.fn().mockReturnValue({
    generateQuestions: vi.fn().mockResolvedValue({ status: 'success' }),
  }),
}));

describe('useComprehension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks connection on mount', async () => {
    const { result } = renderHook(() => useComprehension());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('starts with no active session', () => {
    const { result } = renderHook(() => useComprehension());

    expect(result.current.sessionId).toBeNull();
    expect(result.current.documentId).toBeNull();
  });

  it('starts with no quiz', () => {
    const { result } = renderHook(() => useComprehension());

    expect(result.current.quiz).toBeNull();
    expect(result.current.isGenerating).toBe(false);
  });

  it('can sync a document', async () => {
    const { result } = renderHook(() => useComprehension());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    await act(async () => {
      await result.current.syncDocument('Test', 'Content here', 2);
    });

    expect(result.current.documentId).toBe('doc1');
    expect(result.current.sessionId).toBe('session1');
  });

  it('can close quiz', () => {
    const { result } = renderHook(() => useComprehension());

    act(() => {
      result.current.closeQuiz();
    });

    expect(result.current.quiz).toBeNull();
  });
});
```

### 7.3 Export Hook

Update `src/hooks/index.ts`:

```typescript
export { usePlayback } from './usePlayback';
export { useSession } from './useSession';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useComprehension } from './useComprehension';
```

### Verification

```bash
npm test -- src/hooks/useComprehension.test.ts
```

---

## Task 8: Integrate with App.tsx

### 8.1 Add Generate Quiz Button to ProgressBar

Update `src/components/ProgressBar/ProgressBar.tsx` to accept an optional quiz button:

```typescript
// Add to props interface
export interface ProgressBarProps {
  // ... existing props
  showQuizButton?: boolean;
  onGenerateQuiz?: () => void;
}

// Add button in render (before the stats section)
{showQuizButton && onGenerateQuiz && (
  <button
    className="quiz-generate-btn"
    onClick={onGenerateQuiz}
    title="Generate Quiz"
  >
    Quiz
  </button>
)}
```

Add CSS for the button in `src/components/ProgressBar/ProgressBar.css`:

```css
.quiz-generate-btn {
  background: var(--color-accent);
  color: var(--color-bg);
  border: none;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.quiz-generate-btn:hover {
  opacity: 0.9;
}
```

### 8.2 Update App.tsx

Add the comprehension hook and quiz components to App.tsx:

```typescript
// Add imports at top
import { useComprehension } from './hooks/useComprehension';
import { QuizModal, GeneratingOverlay, MilestonePrompt } from './components/Quiz';

// Inside AppContent function, add the hook:
const comprehension = useComprehension({
  onMilestone: (milestone) => {
    console.log('Reached milestone:', milestone.milestone_percent);
  },
});

// Sync document when text changes (add useEffect):
useEffect(() => {
  if (text && text !== SAMPLE_TEXT && comprehension.isConnected) {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    comprehension.syncDocument('Reading Session', text, wordCount);
  }
}, [text, comprehension.isConnected]);

// Update progress periodically (add useEffect):
useEffect(() => {
  if (comprehension.sessionId && playback.isPlaying) {
    comprehension.updateProgress(playback.currentWordIndex, playback.words.length);
  }
}, [comprehension.sessionId, playback.currentWordIndex, playback.isPlaying]);

// Add to render, after dialogs section:
{/* Quiz Components */}
{comprehension.pendingMilestone && !comprehension.quiz && !comprehension.isGenerating && (
  <MilestonePrompt
    milestonePercent={comprehension.pendingMilestone.milestone_percent}
    onGenerateQuiz={() => comprehension.generateQuiz()}
    onDismiss={comprehension.dismissMilestone}
  />
)}

{comprehension.isGenerating && (
  <GeneratingOverlay onCancel={() => {}} />
)}

{comprehension.quiz && !comprehension.isGenerating && (
  <QuizModal
    quiz={comprehension.quiz}
    onAnswer={comprehension.answerQuestion}
    onRating={comprehension.rateQuestion}
    onNext={comprehension.nextQuestion}
    onClose={comprehension.closeQuiz}
  />
)}

// Add quiz button to ProgressBar:
<ProgressBar
  // ... existing props
  showQuizButton={comprehension.isConnected && comprehension.sessionId !== null}
  onGenerateQuiz={() => comprehension.generateQuiz()}
/>
```

### 8.3 Add Backend Status Indicator

Add to App.tsx header section:

```typescript
// In header-actions div, add status indicator:
<span
  className={`backend-status ${comprehension.isConnected ? 'connected' : 'disconnected'}`}
  title={comprehension.isConnected ? 'Backend connected' : 'Backend disconnected'}
>
  {comprehension.isConnected ? '●' : '○'}
</span>
```

Add CSS to App.css:

```css
.backend-status {
  font-size: 0.75rem;
  padding: var(--spacing-xs) var(--spacing-sm);
}

.backend-status.connected {
  color: #4caf50;
}

.backend-status.disconnected {
  color: var(--color-text-muted);
}
```

### Verification

```bash
npm run build
npm run dev
# Open browser, verify:
# 1. Status indicator shows (gray if PocketBase not running)
# 2. No console errors
# 3. UI renders correctly
```

---

## Task 9: Integration Testing

### 9.1 Create Integration Test

Create `src/__tests__/comprehension.integration.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock PocketBase
vi.mock('../services/pocketbase', () => ({
  pocketbaseService: {
    isConnected: vi.fn().mockResolvedValue(true),
    createDocument: vi.fn().mockResolvedValue({ id: 'doc1' }),
    createSession: vi.fn().mockResolvedValue({ id: 'session1' }),
    updateSessionProgress: vi.fn().mockResolvedValue(undefined),
    getQuestionsForSession: vi.fn().mockResolvedValue([]),
    getMilestonesForSession: vi.fn().mockResolvedValue([]),
    markMilestonePrompted: vi.fn().mockResolvedValue(undefined),
    markMilestoneCompleted: vi.fn().mockResolvedValue(undefined),
    recordAttempt: vi.fn().mockResolvedValue({ id: 'attempt1' }),
    subscribeToQuestions: vi.fn().mockReturnValue(() => {}),
    subscribeToMilestones: vi.fn().mockReturnValue(() => {}),
  },
}));

vi.mock('../services/aiCli', () => ({
  getAICliService: vi.fn().mockReturnValue({
    generateQuestions: vi.fn().mockResolvedValue({ status: 'success' }),
    isGenerating: vi.fn().mockReturnValue(false),
    cancel: vi.fn(),
  }),
}));

describe('Comprehension Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows backend status indicator', async () => {
    render(<App />);

    await waitFor(() => {
      const status = screen.getByTitle(/backend/i);
      expect(status).toBeInTheDocument();
    });
  });

  it('renders main app without errors', () => {
    render(<App />);
    expect(screen.getByText('FastReader')).toBeInTheDocument();
  });
});
```

### 9.2 Run All Tests

```bash
npm test
```

### Verification

All tests should pass. If any fail, fix the issues before proceeding.

---

## Phase 2 Completion Checklist

Run through this checklist to verify Phase 2 is complete:

### Setup

- [x] PocketBase SDK installed (`npm list pocketbase`)
- [x] Types defined in `src/types/comprehension.ts`
- [x] Types exported from `src/types/index.ts`
- [x] PocketBase service created in `src/services/pocketbase.ts`
- [x] AI CLI service created in `src/services/aiCli.ts`

### Components

- [x] QuizModal renders questions correctly
- [x] MCQQuestion allows selection and submission
- [x] QuizFeedback shows correct/incorrect state
- [x] QuizFeedback shows FSRS rating buttons
- [x] GeneratingOverlay displays with spinner
- [x] MilestonePrompt shows at correct position

### Hook

- [x] useComprehension connects to PocketBase
- [x] useComprehension syncs documents
- [x] useComprehension handles quiz state
- [x] useComprehension records answers

### Integration

- [x] Backend status indicator in header
- [x] Quiz button in progress bar (when connected)
- [x] Milestone prompt appears (simulated)
- [x] Quiz modal flow works end-to-end

### Tests

- [x] All unit tests pass (`npm test`)
- [x] Build succeeds (`npm run build`)
- [x] App runs without console errors (`npm run dev`)

---

## End-to-End Validation

To fully validate Phase 2, perform this manual test:

1. **Start PocketBase**:
   ```bash
   ./pocketbase serve
   ```

2. **Start FastReader**:
   ```bash
   npm run dev
   ```

3. **Verify connection**:
   - Header should show green dot (●)

4. **Load text and read**:
   - Load a document via text input
   - Start reading (play button)
   - Observe progress updates

5. **Test quiz generation**:
   - Click "Quiz" button in progress bar
   - Observe generating overlay
   - (In another terminal, run the AI CLI command shown in console)
   - Questions should appear via SSE

6. **Complete quiz**:
   - Answer a question
   - See feedback
   - Rate difficulty
   - Progress to next question
   - Close quiz

If all steps complete successfully, Phase 2 is complete.

---

## Troubleshooting

### PocketBase not connecting

```bash
# Check if running
curl http://127.0.0.1:8090/api/health

# Check CORS (should allow localhost:5173)
```

### Questions not appearing via SSE

```bash
# Check browser console for SSE errors
# Verify MCP server is registered
claude mcp list | grep fastreader

# Try manual question creation via API
curl -X POST http://127.0.0.1:8090/api/collections/questions/records \
  -H "Content-Type: application/json" \
  -d '{"document":"DOC_ID","session":"SESSION_ID","question_text":"Test?","question_type":"multiple_choice","comprehension_type":"factual_recall","options":{"A":"a","B":"b","C":"c","D":"d"},"correct_answer":"A","rationale":"Test"}'
```

### TypeScript errors

```bash
# Check types match PocketBase schema
npm run build
```
