# Phase 5: Review Dashboard Implementation Guide

**Goal**: Enable users to manage and complete spaced repetition reviews within FastReader.

**Prerequisites**: Phases 1-4 complete (PocketBase running, FSRS hooks implemented, quiz UI functional).

---

## Overview

This phase adds a dedicated review dashboard where users can:

- See questions due for review today
- Complete review sessions with FSRS rating
- View learning statistics

**Components to build**:

1. Review Dashboard page (`/review`)
2. Due Questions list component
3. Review Session flow
4. Statistics display

---

## Task 1: Review Dashboard Route and Layout ✅ COMPLETED

### What to Build

Create the main Review Dashboard page with routing.

**File**: `src/pages/ReviewDashboard.tsx`

```tsx
import { useState, useEffect } from 'react';
import { usePocketBase } from '../contexts/PocketBaseContext';
import DueQuestionsList from '../components/review/DueQuestionsList';
import ReviewStats from '../components/review/ReviewStats';
import ReviewSession from '../components/review/ReviewSession';

type ViewMode = 'dashboard' | 'session';

export default function ReviewDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const startReview = (documentId?: string) => {
    setSelectedDocumentId(documentId || null);
    setViewMode('session');
  };

  const endReview = () => {
    setViewMode('dashboard');
    setSelectedDocumentId(null);
  };

  if (viewMode === 'session') {
    return (
      <ReviewSession documentId={selectedDocumentId} onComplete={endReview} onCancel={endReview} />
    );
  }

  return (
    <div className="review-dashboard">
      <header className="review-dashboard__header">
        <h1>Review</h1>
      </header>

      <div className="review-dashboard__content">
        <ReviewStats />
        <DueQuestionsList onStartReview={startReview} />
      </div>
    </div>
  );
}
```

**File**: `src/App.tsx` (add route)

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ReviewDashboard from './pages/ReviewDashboard';
// ... other imports

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* existing routes */}
        <Route path="/review" element={<ReviewDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Verification

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:5173/review`
3. Confirm the page loads without errors
4. Check browser console for any React errors

---

## Task 2: Due Questions List Component ✅ COMPLETED

### What to Build

A component that fetches and displays questions due for review, grouped by document.

**File**: `src/hooks/useDueQuestions.ts`

```ts
import { useState, useEffect, useCallback } from 'react';
import { usePocketBase } from '../contexts/PocketBaseContext';

interface DueQuestion {
  id: string;
  questionId: string;
  questionText: string;
  questionType: string;
  documentId: string;
  documentTitle: string;
  dueAt: string;
  stability: number;
  difficulty: number;
  state: number;
  reps: number;
  lapses: number;
}

interface DueQuestionsResult {
  questions: DueQuestion[];
  totalDue: number;
  byDocument: Map<string, { title: string; count: number; questions: DueQuestion[] }>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDueQuestions(): DueQuestionsResult {
  const { pb } = usePocketBase();
  const [questions, setQuestions] = useState<DueQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDueQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      // Get all question_attempts with due_at <= now
      const attempts = await pb.collection('question_attempts').getList(1, 100, {
        filter: `due_at <= "${now}"`,
        sort: 'due_at',
        expand: 'question,question.document',
      });

      const dueQuestions: DueQuestion[] = attempts.items.map((attempt) => {
        const question = attempt.expand?.question;
        const document = question?.expand?.document;

        return {
          id: attempt.id,
          questionId: question?.id || '',
          questionText: question?.question_text || '',
          questionType: question?.question_type || '',
          documentId: document?.id || '',
          documentTitle: document?.title || 'Unknown Document',
          dueAt: attempt.due_at,
          stability: attempt.stability || 0,
          difficulty: attempt.difficulty || 5,
          state: attempt.state || 0,
          reps: attempt.reps || 0,
          lapses: attempt.lapses || 0,
        };
      });

      setQuestions(dueQuestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch due questions');
    } finally {
      setIsLoading(false);
    }
  }, [pb]);

  useEffect(() => {
    fetchDueQuestions();
  }, [fetchDueQuestions]);

  // Group questions by document
  const byDocument = new Map<string, { title: string; count: number; questions: DueQuestion[] }>();

  for (const q of questions) {
    const existing = byDocument.get(q.documentId);
    if (existing) {
      existing.count++;
      existing.questions.push(q);
    } else {
      byDocument.set(q.documentId, {
        title: q.documentTitle,
        count: 1,
        questions: [q],
      });
    }
  }

  return {
    questions,
    totalDue: questions.length,
    byDocument,
    isLoading,
    error,
    refresh: fetchDueQuestions,
  };
}
```

**File**: `src/components/review/DueQuestionsList.tsx`

```tsx
import { useDueQuestions } from '../../hooks/useDueQuestions';

interface Props {
  onStartReview: (documentId?: string) => void;
}

export default function DueQuestionsList({ onStartReview }: Props) {
  const { totalDue, byDocument, isLoading, error, refresh } = useDueQuestions();

  if (isLoading) {
    return <div className="due-questions-list due-questions-list--loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="due-questions-list due-questions-list--error">
        <p>Error: {error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  if (totalDue === 0) {
    return (
      <div className="due-questions-list due-questions-list--empty">
        <p>No questions due for review.</p>
        <p className="due-questions-list__hint">
          Complete quizzes while reading to build your review queue.
        </p>
      </div>
    );
  }

  const documentEntries = Array.from(byDocument.entries());

  return (
    <div className="due-questions-list">
      <div className="due-questions-list__header">
        <h2>{totalDue} questions due</h2>
        <button className="due-questions-list__review-all" onClick={() => onStartReview()}>
          Review All
        </button>
      </div>

      <ul className="due-questions-list__documents">
        {documentEntries.map(([docId, { title, count }]) => (
          <li key={docId} className="due-questions-list__document">
            <div className="due-questions-list__document-info">
              <span className="due-questions-list__document-title">{title}</span>
              <span className="due-questions-list__document-count">{count} due</span>
            </div>
            <button
              className="due-questions-list__document-review"
              onClick={() => onStartReview(docId)}
            >
              Review
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Verification

1. Ensure PocketBase has at least one question_attempt with `due_at` in the past
2. Navigate to `/review`
3. Confirm the due questions list shows the correct count
4. Confirm documents are grouped correctly
5. Test the empty state by setting all `due_at` values to the future

**Manual test data setup**:

```bash
# Create a test question_attempt with due_at in the past via PocketBase Admin UI
# or use curl:
curl -X POST http://127.0.0.1:8090/api/collections/question_attempts/records \
  -H "Content-Type: application/json" \
  -d '{"question": "QUESTION_ID", "due_at": "2024-01-01T00:00:00Z", "state": 2}'
```

---

## Task 3: Review Statistics Component ✅ COMPLETED

### What to Build

Display review statistics: total answered, accuracy rate, questions by state.

**File**: `src/hooks/useReviewStats.ts`

```ts
import { useState, useEffect } from 'react';
import { usePocketBase } from '../contexts/PocketBaseContext';

interface ReviewStats {
  totalQuestionsAnswered: number;
  correctCount: number;
  accuracyRate: number;
  questionsByState: {
    new: number;
    learning: number;
    review: number;
    relearning: number;
  };
  streakDays: number;
  isLoading: boolean;
  error: string | null;
}

export function useReviewStats(): ReviewStats {
  const { pb } = usePocketBase();
  const [stats, setStats] = useState<ReviewStats>({
    totalQuestionsAnswered: 0,
    correctCount: 0,
    accuracyRate: 0,
    questionsByState: { new: 0, learning: 0, review: 0, relearning: 0 },
    streakDays: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Total attempts
        const totalAttempts = await pb.collection('question_attempts').getList(1, 1);

        // Correct attempts
        const correctAttempts = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'is_correct = true',
        });

        // Count by state (get latest attempt per question)
        const stateNew = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'state = 0',
        });
        const stateLearning = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'state = 1',
        });
        const stateReview = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'state = 2',
        });
        const stateRelearning = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'state = 3',
        });

        const total = totalAttempts.totalItems;
        const correct = correctAttempts.totalItems;

        setStats({
          totalQuestionsAnswered: total,
          correctCount: correct,
          accuracyRate: total > 0 ? correct / total : 0,
          questionsByState: {
            new: stateNew.totalItems,
            learning: stateLearning.totalItems,
            review: stateReview.totalItems,
            relearning: stateRelearning.totalItems,
          },
          streakDays: 0, // Could calculate from attempt dates
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load stats',
        }));
      }
    }

    fetchStats();
  }, [pb]);

  return stats;
}
```

**File**: `src/components/review/ReviewStats.tsx`

```tsx
import { useReviewStats } from '../../hooks/useReviewStats';

export default function ReviewStats() {
  const stats = useReviewStats();

  if (stats.isLoading) {
    return <div className="review-stats review-stats--loading">Loading stats...</div>;
  }

  if (stats.error) {
    return <div className="review-stats review-stats--error">Could not load statistics</div>;
  }

  const accuracyPercent = Math.round(stats.accuracyRate * 100);

  return (
    <div className="review-stats">
      <div className="review-stats__card">
        <span className="review-stats__value">{stats.totalQuestionsAnswered}</span>
        <span className="review-stats__label">Total Answered</span>
      </div>

      <div className="review-stats__card">
        <span className="review-stats__value">{accuracyPercent}%</span>
        <span className="review-stats__label">Accuracy</span>
      </div>

      <div className="review-stats__card">
        <span className="review-stats__value">{stats.questionsByState.review}</span>
        <span className="review-stats__label">Mastered</span>
      </div>

      <div className="review-stats__card">
        <span className="review-stats__value">
          {stats.questionsByState.learning + stats.questionsByState.relearning}
        </span>
        <span className="review-stats__label">Learning</span>
      </div>
    </div>
  );
}
```

### Verification

1. Navigate to `/review`
2. Confirm stats cards display correctly
3. Verify accuracy percentage calculation matches manual calculation from PocketBase data
4. Test with zero attempts (should show 0% or handle gracefully)

---

## Task 4: Review Session Component ✅ COMPLETED

### What to Build

The interactive review flow where users answer questions and rate difficulty.

**File**: `src/components/review/ReviewSession.tsx`

```tsx
import { useState, useEffect } from 'react';
import { usePocketBase } from '../../contexts/PocketBaseContext';
import QuestionCard from './QuestionCard';
import ReviewComplete from './ReviewComplete';

interface Props {
  documentId: string | null;
  onComplete: () => void;
  onCancel: () => void;
}

interface ReviewQuestion {
  attemptId: string;
  questionId: string;
  questionText: string;
  questionType: string;
  options?: Record<string, string>;
  correctAnswer: string;
  rationale: string;
}

export default function ReviewSession({ documentId, onComplete, onCancel }: Props) {
  const { pb } = usePocketBase();
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<{ correct: number; total: number }>({
    correct: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuestions() {
      const now = new Date().toISOString();
      let filter = `due_at <= "${now}"`;

      if (documentId) {
        filter += ` && question.document = "${documentId}"`;
      }

      const attempts = await pb.collection('question_attempts').getList(1, 50, {
        filter,
        sort: 'due_at',
        expand: 'question',
      });

      const reviewQuestions: ReviewQuestion[] = attempts.items.map((attempt) => {
        const q = attempt.expand?.question;
        return {
          attemptId: attempt.id,
          questionId: q?.id || '',
          questionText: q?.question_text || '',
          questionType: q?.question_type || 'multiple_choice',
          options: q?.options,
          correctAnswer: q?.correct_answer || '',
          rationale: q?.rationale || '',
        };
      });

      setQuestions(reviewQuestions);
      setIsLoading(false);
    }

    loadQuestions();
  }, [pb, documentId]);

  const currentQuestion = questions[currentIndex];
  const isComplete = currentIndex >= questions.length;

  const handleAnswer = (answer: string) => {
    setUserAnswer(answer);
    setShowAnswer(true);
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4) => {
    if (!currentQuestion) return;

    const isCorrect = userAnswer === currentQuestion.correctAnswer;

    // Record the attempt
    await pb.collection('question_attempts').create({
      question: currentQuestion.questionId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      rating,
    });

    setResults((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Move to next question
    setShowAnswer(false);
    setUserAnswer(null);
    setCurrentIndex((prev) => prev + 1);
  };

  if (isLoading) {
    return <div className="review-session review-session--loading">Loading review...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="review-session review-session--empty">
        <p>No questions to review.</p>
        <button onClick={onCancel}>Back to Dashboard</button>
      </div>
    );
  }

  if (isComplete) {
    return <ReviewComplete correct={results.correct} total={results.total} onDone={onComplete} />;
  }

  return (
    <div className="review-session">
      <header className="review-session__header">
        <button className="review-session__cancel" onClick={onCancel}>
          Cancel
        </button>
        <span className="review-session__progress">
          {currentIndex + 1} / {questions.length}
        </span>
      </header>

      <QuestionCard
        question={currentQuestion}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        onRating={handleRating}
      />
    </div>
  );
}
```

**File**: `src/components/review/QuestionCard.tsx`

```tsx
interface Question {
  questionText: string;
  questionType: string;
  options?: Record<string, string>;
  correctAnswer: string;
  rationale: string;
}

interface Props {
  question: Question;
  showAnswer: boolean;
  userAnswer: string | null;
  onAnswer: (answer: string) => void;
  onRating: (rating: 1 | 2 | 3 | 4) => void;
}

export default function QuestionCard({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  onRating,
}: Props) {
  const isCorrect = userAnswer === question.correctAnswer;

  if (showAnswer) {
    return (
      <div className="question-card question-card--feedback">
        <div
          className={`question-card__result ${isCorrect ? 'question-card__result--correct' : 'question-card__result--incorrect'}`}
        >
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </div>

        <p className="question-card__question">{question.questionText}</p>

        <p className="question-card__rationale">{question.rationale}</p>

        <div className="question-card__rating">
          <p>How difficult was this?</p>
          <div className="question-card__rating-buttons">
            <button onClick={() => onRating(1)}>Again</button>
            <button onClick={() => onRating(2)}>Hard</button>
            <button onClick={() => onRating(3)}>Good</button>
            <button onClick={() => onRating(4)}>Easy</button>
          </div>
        </div>
      </div>
    );
  }

  // Multiple choice display
  if (question.questionType === 'multiple_choice' && question.options) {
    return (
      <div className="question-card">
        <p className="question-card__question">{question.questionText}</p>

        <div className="question-card__options">
          {Object.entries(question.options).map(([key, value]) => (
            <button key={key} className="question-card__option" onClick={() => onAnswer(key)}>
              <span className="question-card__option-key">{key}</span>
              <span className="question-card__option-text">{value}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Short answer / fill-in-blank
  return (
    <div className="question-card">
      <p className="question-card__question">{question.questionText}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const input = form.elements.namedItem('answer') as HTMLInputElement;
          onAnswer(input.value);
        }}
      >
        <input
          type="text"
          name="answer"
          className="question-card__input"
          placeholder="Your answer..."
          autoFocus
        />
        <button type="submit" className="question-card__submit">
          Submit
        </button>
      </form>
    </div>
  );
}
```

**File**: `src/components/review/ReviewComplete.tsx`

```tsx
interface Props {
  correct: number;
  total: number;
  onDone: () => void;
}

export default function ReviewComplete({ correct, total, onDone }: Props) {
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="review-complete">
      <h2>Review Complete</h2>

      <div className="review-complete__score">
        <span className="review-complete__correct">{correct}</span>
        <span className="review-complete__separator">/</span>
        <span className="review-complete__total">{total}</span>
      </div>

      <p className="review-complete__percentage">{percentage}% correct</p>

      <button className="review-complete__done" onClick={onDone}>
        Back to Dashboard
      </button>
    </div>
  );
}
```

### Verification

1. Create test data: at least 3 questions with `due_at` in the past
2. Navigate to `/review` and click "Review All"
3. Answer each question and verify:
   - MCQ options display correctly
   - Clicking an option shows the feedback view
   - Rating buttons are clickable
   - Progress counter updates
4. Complete the review and verify the summary shows correct counts
5. Check PocketBase: new `question_attempts` records should exist with updated FSRS fields

---

## Task 5: Styling

### What to Build

Basic CSS for the review components. Adapt to your existing design system.

**File**: `src/styles/review.css`

```css
/* Review Dashboard */
.review-dashboard {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.review-dashboard__header h1 {
  margin-bottom: 2rem;
}

/* Stats */
.review-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.review-stats__card {
  background: var(--bg-secondary, #f5f5f5);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.review-stats__value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
}

.review-stats__label {
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

/* Due Questions List */
.due-questions-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.due-questions-list__documents {
  list-style: none;
  padding: 0;
}

.due-questions-list__document {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.due-questions-list__document-title {
  font-weight: 500;
}

.due-questions-list__document-count {
  color: var(--text-secondary, #666);
  margin-left: 0.5rem;
}

.due-questions-list--empty {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary, #666);
}

/* Review Session */
.review-session {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.review-session__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
}

/* Question Card */
.question-card {
  background: var(--bg-secondary, #f5f5f5);
  padding: 2rem;
  border-radius: 12px;
}

.question-card__question {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
}

.question-card__options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-card__option {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
}

.question-card__option:hover {
  border-color: var(--primary-color, #007bff);
}

.question-card__option-key {
  font-weight: bold;
  margin-right: 1rem;
}

.question-card__result--correct {
  color: var(--success-color, #28a745);
  font-weight: bold;
  margin-bottom: 1rem;
}

.question-card__result--incorrect {
  color: var(--error-color, #dc3545);
  font-weight: bold;
  margin-bottom: 1rem;
}

.question-card__rating {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #ddd);
}

.question-card__rating-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.question-card__rating-buttons button {
  flex: 1;
  padding: 0.75rem;
  border-radius: 6px;
}

/* Review Complete */
.review-complete {
  text-align: center;
  padding: 3rem;
}

.review-complete__score {
  font-size: 3rem;
  margin: 2rem 0;
}

.review-complete__percentage {
  font-size: 1.25rem;
  color: var(--text-secondary, #666);
  margin-bottom: 2rem;
}
```

Import in your main CSS or component:

```tsx
import '../styles/review.css';
```

### Verification

1. Navigate to `/review`
2. Verify layout looks reasonable at different viewport widths
3. Check button hover states work
4. Verify correct/incorrect colors display properly in feedback view

---

## Task 6: Navigation Link

### What to Build

Add a navigation link to the review dashboard from the main app.

**File**: Update your main navigation component (location varies by project)

```tsx
// Example: src/components/Navigation.tsx
import { NavLink } from 'react-router-dom';
import { useDueQuestions } from '../hooks/useDueQuestions';

export default function Navigation() {
  const { totalDue } = useDueQuestions();

  return (
    <nav className="navigation">
      <NavLink to="/">Read</NavLink>
      <NavLink to="/review" className="navigation__review">
        Review
        {totalDue > 0 && <span className="navigation__badge">{totalDue}</span>}
      </NavLink>
    </nav>
  );
}
```

### Verification

1. Confirm "Review" link appears in navigation
2. Verify badge shows correct count when questions are due
3. Click the link and confirm it navigates to `/review`

---

## Final Integration Testing

### Test Scenario 1: Empty State

1. Clear all `question_attempts` from PocketBase (or set all `due_at` to future)
2. Navigate to `/review`
3. **Expected**: Stats show zeros, "No questions due" message displays

### Test Scenario 2: Full Review Flow

1. Set up test data:
   - 1 document with 3 questions
   - 3 question_attempts with `due_at` in the past, `state = 2`
2. Navigate to `/review`
3. Verify stats and due count display correctly
4. Click "Review All"
5. Answer all 3 questions (mix of correct/incorrect)
6. Rate each question
7. **Expected**: Summary shows correct score
8. Check PocketBase: 3 new `question_attempts` created with FSRS fields populated

### Test Scenario 3: Document-Specific Review

1. Set up test data:
   - 2 documents, each with 2 questions due
2. Navigate to `/review`
3. Click "Review" on one specific document
4. **Expected**: Only that document's questions appear
5. Complete review
6. Return to dashboard
7. **Expected**: Due count decreased, other document still shows due questions

### Test Scenario 4: Navigation Badge

1. Have questions due for review
2. Navigate around the app
3. **Expected**: Badge in navigation shows correct count
4. Complete a review
5. **Expected**: Badge count decreases

---

## Checklist

- [x] `/review` route loads without errors (Task 1 completed)
- [x] Due questions list fetches and displays correctly (Task 2 completed)
- [x] Questions grouped by document (Task 2 completed)
- [x] Statistics display correctly (Task 3 completed)
- [ ] Review session starts with selected questions
- [ ] MCQ options are clickable
- [ ] Correct/incorrect feedback displays
- [ ] FSRS rating buttons work
- [ ] Question attempts saved to PocketBase
- [ ] FSRS hook updates `due_at`, `stability`, etc.
- [ ] Review complete summary shows accurate counts
- [ ] Navigation badge shows due count
- [ ] Empty states handled gracefully
- [ ] Basic styling applied

---

## Notes for Implementation

- The `usePocketBase` hook should be implemented in Phase 1. If not, create a simple context that exposes the PocketBase client.
- Adjust type imports based on your existing type definitions.
- The FSRS fields are calculated by the `pb_hooks/fsrs.pb.js` hook on the server side - you just need to provide the `rating` field when creating attempts.
- Consider adding optimistic UI updates for smoother UX in production.
