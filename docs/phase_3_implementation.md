# Phase 3: Additional Question Types - Implementation Guide

**Prerequisites**: Phase 1 and Phase 2 must be complete. The following should already exist:
- PocketBase backend with all collections
- Quiz modal with MCQ support
- Answer submission flow with FSRS rating
- SSE subscriptions working

**Goal**: Add support for short answer and fill-in-the-blank question types with self-assessment UI.

---

## Overview

Phase 3 adds two new question types to the existing quiz system:

| Type | User Interaction | Grading |
|------|------------------|---------|
| Short Answer | Text input | Self-assessment (user rates own answer) |
| Fill-in-Blank | Text input for blank | Auto-check against `correct_answers` array |

Both types share a common self-assessment step where users rate difficulty using FSRS scale.

---

## Task 1: Short Answer Question Component ✅ COMPLETED

### 1.1 What to Build

A component that displays a short answer question with:
- Question text
- Multi-line text input for user's answer
- Submit button
- Display of ideal answer after submission for self-comparison

### 1.2 Data Model Reference

From the `questions` collection, short answer questions use:

```typescript
interface ShortAnswerQuestion {
  question_text: string;
  question_type: 'short_answer';
  comprehension_type: 'factual_recall' | 'inference' | 'synthesis';
  difficulty?: 'easy' | 'medium' | 'hard';

  // Short answer specific
  ideal_answer: string;              // Model response to show after submission
  acceptable_variations?: string[];   // Alternative correct phrasings
  required_concepts?: string[];       // Concepts that should appear in answer
  scoring_rubric?: {
    full_credit: string;    // Description of what earns full credit
    partial_credit: string; // Description of partial credit
    no_credit: string;      // Description of no credit
  };

  rationale: string;
  passage_evidence?: string;
}
```

### 1.3 Implementation

Create `src/components/quiz/ShortAnswerQuestion.tsx`:

```tsx
import { useState } from 'react';
import { Question } from '../../types';

interface Props {
  question: Question;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function ShortAnswerQuestion({ question, onSubmit, disabled }: Props) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer.trim());
    }
  };

  return (
    <div className="short-answer-question">
      <div className="question-header">
        <span className="question-type-badge">Short Answer</span>
        {question.difficulty && (
          <span className={`difficulty-badge ${question.difficulty}`}>
            {question.difficulty}
          </span>
        )}
      </div>

      <p className="question-text">{question.question_text}</p>

      {question.context_hint && (
        <p className="context-hint">Hint: {question.context_hint}</p>
      )}

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
        rows={4}
        disabled={disabled}
        className="answer-input"
      />

      <button
        onClick={handleSubmit}
        disabled={disabled || !answer.trim()}
        className="submit-button"
      >
        Submit Answer
      </button>
    </div>
  );
}
```

### 1.4 Verification

Create `src/components/quiz/__tests__/ShortAnswerQuestion.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ShortAnswerQuestion } from '../ShortAnswerQuestion';

const mockQuestion = {
  id: 'q1',
  question_text: 'Explain the main theme of the passage.',
  question_type: 'short_answer' as const,
  comprehension_type: 'inference' as const,
  ideal_answer: 'The main theme is the struggle between tradition and progress.',
  rationale: 'The author repeatedly contrasts old and new ways.',
  difficulty: 'medium' as const,
};

describe('ShortAnswerQuestion', () => {
  it('renders question text', () => {
    render(<ShortAnswerQuestion question={mockQuestion} onSubmit={() => {}} />);
    expect(screen.getByText(/Explain the main theme/)).toBeInTheDocument();
  });

  it('calls onSubmit with trimmed answer', () => {
    const handleSubmit = vi.fn();
    render(<ShortAnswerQuestion question={mockQuestion} onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByPlaceholderText(/Type your answer/), {
      target: { value: '  My answer here  ' }
    });
    fireEvent.click(screen.getByText('Submit Answer'));

    expect(handleSubmit).toHaveBeenCalledWith('My answer here');
  });

  it('disables submit when answer is empty', () => {
    render(<ShortAnswerQuestion question={mockQuestion} onSubmit={() => {}} />);
    expect(screen.getByText('Submit Answer')).toBeDisabled();
  });

  it('disables input when disabled prop is true', () => {
    render(<ShortAnswerQuestion question={mockQuestion} onSubmit={() => {}} disabled />);
    expect(screen.getByPlaceholderText(/Type your answer/)).toBeDisabled();
  });
});
```

Run: `npm test -- ShortAnswerQuestion`

---

## Task 2: Fill-in-the-Blank Question Component ✅ COMPLETED

### 2.1 What to Build

A component that displays a sentence with a blank and:
- Shows the sentence with `_____` placeholder
- Provides a text input for the blank
- Auto-checks against the `correct_answers` array on submit

### 2.2 Data Model Reference

```typescript
interface FillInBlankQuestion {
  question_text: string;
  question_type: 'fill_in_blank';
  comprehension_type: 'factual_recall' | 'inference' | 'synthesis';

  // Fill-in-blank specific
  sentence_with_blank: string;     // e.g., "The author argues that _____ is essential."
  correct_answers: string[];       // e.g., ["education", "learning", "knowledge"]
  context_hint?: string;           // Optional hint

  rationale: string;
}
```

### 2.3 Implementation

Create `src/components/quiz/FillInBlankQuestion.tsx`:

```tsx
import { useState } from 'react';
import { Question } from '../../types';

interface Props {
  question: Question;
  onSubmit: (answer: string, isCorrect: boolean) => void;
  disabled?: boolean;
}

export function FillInBlankQuestion({ question, onSubmit, disabled }: Props) {
  const [answer, setAnswer] = useState('');

  const checkAnswer = (userAnswer: string): boolean => {
    const normalized = userAnswer.trim().toLowerCase();
    return (question.correct_answers || []).some(
      correct => correct.toLowerCase() === normalized
    );
  };

  const handleSubmit = () => {
    if (answer.trim()) {
      const isCorrect = checkAnswer(answer);
      onSubmit(answer.trim(), isCorrect);
    }
  };

  // Render sentence with blank highlighted
  const renderSentence = () => {
    const sentence = question.sentence_with_blank || question.question_text;
    const parts = sentence.split('_____');

    if (parts.length === 1) {
      return <p className="sentence">{sentence}</p>;
    }

    return (
      <p className="sentence">
        {parts[0]}
        <span className="blank-indicator">[_____]</span>
        {parts[1]}
      </p>
    );
  };

  return (
    <div className="fill-in-blank-question">
      <div className="question-header">
        <span className="question-type-badge">Fill in the Blank</span>
      </div>

      {renderSentence()}

      {question.context_hint && (
        <p className="context-hint">Hint: {question.context_hint}</p>
      )}

      <div className="answer-row">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Fill in the blank..."
          disabled={disabled}
          className="blank-input"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !answer.trim()}
          className="submit-button"
        >
          Check
        </button>
      </div>
    </div>
  );
}
```

### 2.4 Verification

Create `src/components/quiz/__tests__/FillInBlankQuestion.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FillInBlankQuestion } from '../FillInBlankQuestion';

const mockQuestion = {
  id: 'q1',
  question_text: 'Fill in the blank',
  question_type: 'fill_in_blank' as const,
  comprehension_type: 'factual_recall' as const,
  sentence_with_blank: 'The Industrial Revolution began in _____.',
  correct_answers: ['England', 'Britain', 'Great Britain'],
  rationale: 'The passage states the revolution started in England.',
};

describe('FillInBlankQuestion', () => {
  it('renders sentence with blank indicator', () => {
    render(<FillInBlankQuestion question={mockQuestion} onSubmit={() => {}} />);
    expect(screen.getByText(/Industrial Revolution/)).toBeInTheDocument();
    expect(screen.getByText('[_____]')).toBeInTheDocument();
  });

  it('marks correct answer as correct (case-insensitive)', () => {
    const handleSubmit = vi.fn();
    render(<FillInBlankQuestion question={mockQuestion} onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByPlaceholderText(/Fill in/), {
      target: { value: 'england' }
    });
    fireEvent.click(screen.getByText('Check'));

    expect(handleSubmit).toHaveBeenCalledWith('england', true);
  });

  it('marks incorrect answer as incorrect', () => {
    const handleSubmit = vi.fn();
    render(<FillInBlankQuestion question={mockQuestion} onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByPlaceholderText(/Fill in/), {
      target: { value: 'France' }
    });
    fireEvent.click(screen.getByText('Check'));

    expect(handleSubmit).toHaveBeenCalledWith('France', false);
  });

  it('submits on Enter key', () => {
    const handleSubmit = vi.fn();
    render(<FillInBlankQuestion question={mockQuestion} onSubmit={handleSubmit} />);

    const input = screen.getByPlaceholderText(/Fill in/);
    fireEvent.change(input, { target: { value: 'England' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleSubmit).toHaveBeenCalled();
  });
});
```

Run: `npm test -- FillInBlankQuestion`

---

## Task 3: Self-Assessment Feedback Component ✅ COMPLETED

### 3.1 What to Build

After submission, users need to:
1. See whether they were correct (for fill-in-blank) or see the ideal answer (for short answer)
2. Rate the difficulty using FSRS scale (1-4)

This component shows the feedback and rating buttons.

### 3.2 FSRS Rating Reference

| Rating | Name | Description | Button Color |
|--------|------|-------------|--------------|
| 1 | Again | Forgot / completely wrong | Red |
| 2 | Hard | Got it but struggled | Orange |
| 3 | Good | Got it with some effort | Green |
| 4 | Easy | Instant recall, too easy | Blue |

### 3.3 Implementation

Create `src/components/quiz/SelfAssessmentFeedback.tsx`:

```tsx
import { Question } from '../../types';

interface Props {
  question: Question;
  userAnswer: string;
  isCorrect?: boolean;  // Provided for fill-in-blank, undefined for short answer
  onRate: (rating: 1 | 2 | 3 | 4) => void;
}

const RATINGS = [
  { value: 1, label: 'Again', description: 'Forgot', className: 'rating-again' },
  { value: 2, label: 'Hard', description: 'Struggled', className: 'rating-hard' },
  { value: 3, label: 'Good', description: 'Got it', className: 'rating-good' },
  { value: 4, label: 'Easy', description: 'Too easy', className: 'rating-easy' },
] as const;

export function SelfAssessmentFeedback({ question, userAnswer, isCorrect, onRate }: Props) {
  const isShortAnswer = question.question_type === 'short_answer';
  const isFillInBlank = question.question_type === 'fill_in_blank';

  return (
    <div className="self-assessment-feedback">
      {/* Result indicator for fill-in-blank */}
      {isFillInBlank && (
        <div className={`result-banner ${isCorrect ? 'correct' : 'incorrect'}`}>
          {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
        </div>
      )}

      {/* Your answer */}
      <div className="answer-section">
        <h4>Your Answer:</h4>
        <p className="user-answer">{userAnswer}</p>
      </div>

      {/* Ideal answer / correct answers */}
      <div className="answer-section">
        <h4>{isShortAnswer ? 'Model Answer:' : 'Correct Answer(s):'}</h4>
        {isShortAnswer ? (
          <p className="ideal-answer">{question.ideal_answer}</p>
        ) : (
          <p className="correct-answers">
            {question.correct_answers?.join(', ')}
          </p>
        )}
      </div>

      {/* Scoring rubric for short answer */}
      {isShortAnswer && question.scoring_rubric && (
        <div className="rubric-section">
          <h4>Scoring Guide:</h4>
          <ul>
            <li><strong>Full credit:</strong> {question.scoring_rubric.full_credit}</li>
            <li><strong>Partial credit:</strong> {question.scoring_rubric.partial_credit}</li>
            <li><strong>No credit:</strong> {question.scoring_rubric.no_credit}</li>
          </ul>
        </div>
      )}

      {/* Explanation */}
      <div className="explanation-section">
        <h4>Explanation:</h4>
        <p>{question.rationale}</p>
        {question.passage_evidence && (
          <blockquote className="evidence">
            "{question.passage_evidence}"
          </blockquote>
        )}
      </div>

      {/* Self-assessment prompt */}
      <div className="rating-section">
        <h4>How well did you know this?</h4>
        <div className="rating-buttons">
          {RATINGS.map(({ value, label, description, className }) => (
            <button
              key={value}
              onClick={() => onRate(value as 1 | 2 | 3 | 4)}
              className={`rating-button ${className}`}
            >
              <span className="rating-label">{label}</span>
              <span className="rating-description">{description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 3.4 Verification

Create `src/components/quiz/__tests__/SelfAssessmentFeedback.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SelfAssessmentFeedback } from '../SelfAssessmentFeedback';

const shortAnswerQuestion = {
  id: 'q1',
  question_type: 'short_answer' as const,
  question_text: 'Explain the theme.',
  comprehension_type: 'inference' as const,
  ideal_answer: 'The theme is about change.',
  rationale: 'Multiple passages reference transformation.',
  scoring_rubric: {
    full_credit: 'Mentions change and provides example',
    partial_credit: 'Mentions change without example',
    no_credit: 'Misidentifies theme',
  },
};

const fillInBlankQuestion = {
  id: 'q2',
  question_type: 'fill_in_blank' as const,
  question_text: 'Fill blank',
  comprehension_type: 'factual_recall' as const,
  sentence_with_blank: 'The answer is _____.',
  correct_answers: ['correct', 'right'],
  rationale: 'Stated in paragraph 2.',
};

describe('SelfAssessmentFeedback', () => {
  it('shows model answer for short answer questions', () => {
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My answer"
        onRate={() => {}}
      />
    );

    expect(screen.getByText('Model Answer:')).toBeInTheDocument();
    expect(screen.getByText('The theme is about change.')).toBeInTheDocument();
  });

  it('shows correct/incorrect banner for fill-in-blank', () => {
    const { rerender } = render(
      <SelfAssessmentFeedback
        question={fillInBlankQuestion}
        userAnswer="correct"
        isCorrect={true}
        onRate={() => {}}
      />
    );
    expect(screen.getByText('✓ Correct!')).toBeInTheDocument();

    rerender(
      <SelfAssessmentFeedback
        question={fillInBlankQuestion}
        userAnswer="wrong"
        isCorrect={false}
        onRate={() => {}}
      />
    );
    expect(screen.getByText('✗ Incorrect')).toBeInTheDocument();
  });

  it('shows scoring rubric for short answer', () => {
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My answer"
        onRate={() => {}}
      />
    );

    expect(screen.getByText(/Full credit:/)).toBeInTheDocument();
    expect(screen.getByText(/Partial credit:/)).toBeInTheDocument();
  });

  it('calls onRate with correct value', () => {
    const handleRate = vi.fn();
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My answer"
        onRate={handleRate}
      />
    );

    fireEvent.click(screen.getByText('Good'));
    expect(handleRate).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByText('Again'));
    expect(handleRate).toHaveBeenCalledWith(1);
  });

  it('displays all four rating options', () => {
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My answer"
        onRate={() => {}}
      />
    );

    expect(screen.getByText('Again')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });
});
```

Run: `npm test -- SelfAssessmentFeedback`

---

## Task 4: Integrate New Question Types into Quiz Modal ✅ COMPLETED

### 4.1 What to Build

Update the existing quiz modal to:
1. Render the correct component based on `question_type`
2. Handle the two-step flow (answer → self-assessment → next question)
3. Record attempts via PocketBase

### 4.2 Implementation

Update `src/components/quiz/QuizModal.tsx` (or create if doesn't exist):

```tsx
import { useState } from 'react';
import PocketBase from 'pocketbase';
import { Question } from '../../types';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { ShortAnswerQuestion } from './ShortAnswerQuestion';
import { FillInBlankQuestion } from './FillInBlankQuestion';
import { SelfAssessmentFeedback } from './SelfAssessmentFeedback';

interface Props {
  questions: Question[];
  onClose: () => void;
  onComplete: () => void;
  pb: PocketBase;
}

type QuizState =
  | { phase: 'answering' }
  | { phase: 'feedback'; userAnswer: string; isCorrect?: boolean };

export function QuizModal({ questions, onClose, onComplete, pb }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<QuizState>({ phase: 'answering' });
  const [startTime, setStartTime] = useState(Date.now());

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleAnswerSubmit = (answer: string, isCorrect?: boolean) => {
    setState({ phase: 'feedback', userAnswer: answer, isCorrect });
  };

  const handleRate = async (rating: 1 | 2 | 3 | 4) => {
    if (state.phase !== 'feedback') return;

    const timeSpent = Date.now() - startTime;

    // Determine isCorrect for the attempt
    let isCorrect = state.isCorrect;
    if (currentQuestion.question_type === 'short_answer') {
      // For short answer, correctness is based on self-assessment
      isCorrect = rating >= 3;
    }

    // Record attempt in PocketBase
    await pb.collection('question_attempts').create({
      question: currentQuestion.id,
      user_answer: state.userAnswer,
      is_correct: isCorrect,
      rating: rating,
      time_spent_ms: timeSpent,
    });

    // Move to next question or complete
    if (isLastQuestion) {
      onComplete();
    } else {
      setCurrentIndex(prev => prev + 1);
      setState({ phase: 'answering' });
      setStartTime(Date.now());
    }
  };

  const renderQuestion = () => {
    if (state.phase === 'feedback') {
      return (
        <SelfAssessmentFeedback
          question={currentQuestion}
          userAnswer={state.userAnswer}
          isCorrect={state.isCorrect}
          onRate={handleRate}
        />
      );
    }

    switch (currentQuestion.question_type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={currentQuestion}
            onSubmit={(answer, isCorrect) => handleAnswerSubmit(answer, isCorrect)}
          />
        );
      case 'short_answer':
        return (
          <ShortAnswerQuestion
            question={currentQuestion}
            onSubmit={(answer) => handleAnswerSubmit(answer, undefined)}
          />
        );
      case 'fill_in_blank':
        return (
          <FillInBlankQuestion
            question={currentQuestion}
            onSubmit={(answer, isCorrect) => handleAnswerSubmit(answer, isCorrect)}
          />
        );
      default:
        return <p>Unknown question type</p>;
    }
  };

  return (
    <div className="quiz-modal-overlay">
      <div className="quiz-modal">
        <div className="quiz-header">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span className="comprehension-badge">
            {currentQuestion.comprehension_type.replace('_', ' ')}
          </span>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="quiz-progress">
          <div
            className="progress-fill"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="quiz-content">
          {renderQuestion()}
        </div>
      </div>
    </div>
  );
}
```

### 4.3 Verification

Create `src/components/quiz/__tests__/QuizModal.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuizModal } from '../QuizModal';

// Mock PocketBase
const mockPb = {
  collection: () => ({
    create: vi.fn().mockResolvedValue({ id: 'attempt-1' }),
  }),
};

const questions = [
  {
    id: 'q1',
    question_type: 'short_answer' as const,
    question_text: 'Short answer question',
    comprehension_type: 'inference' as const,
    ideal_answer: 'The ideal answer',
    rationale: 'Because reasons',
  },
  {
    id: 'q2',
    question_type: 'fill_in_blank' as const,
    question_text: 'Fill blank',
    comprehension_type: 'factual_recall' as const,
    sentence_with_blank: 'The answer is _____.',
    correct_answers: ['correct'],
    rationale: 'Stated directly',
  },
];

describe('QuizModal', () => {
  it('renders short answer question first', () => {
    render(
      <QuizModal
        questions={questions}
        onClose={() => {}}
        onComplete={() => {}}
        pb={mockPb as any}
      />
    );

    expect(screen.getByText('Short answer question')).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
  });

  it('shows feedback after submitting short answer', async () => {
    render(
      <QuizModal
        questions={questions}
        onClose={() => {}}
        onComplete={() => {}}
        pb={mockPb as any}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Type your answer/), {
      target: { value: 'My answer' }
    });
    fireEvent.click(screen.getByText('Submit Answer'));

    expect(screen.getByText('Model Answer:')).toBeInTheDocument();
    expect(screen.getByText('The ideal answer')).toBeInTheDocument();
  });

  it('advances to next question after rating', async () => {
    render(
      <QuizModal
        questions={questions}
        onClose={() => {}}
        onComplete={() => {}}
        pb={mockPb as any}
      />
    );

    // Answer first question
    fireEvent.change(screen.getByPlaceholderText(/Type your answer/), {
      target: { value: 'Answer' }
    });
    fireEvent.click(screen.getByText('Submit Answer'));

    // Rate it
    fireEvent.click(screen.getByText('Good'));

    // Should now show fill-in-blank question
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
      expect(screen.getByText(/The answer is/)).toBeInTheDocument();
    });
  });

  it('calls onComplete after last question', async () => {
    const handleComplete = vi.fn();
    render(
      <QuizModal
        questions={[questions[0]]}
        onClose={() => {}}
        onComplete={handleComplete}
        pb={mockPb as any}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Type your answer/), {
      target: { value: 'Answer' }
    });
    fireEvent.click(screen.getByText('Submit Answer'));
    fireEvent.click(screen.getByText('Good'));

    await waitFor(() => {
      expect(handleComplete).toHaveBeenCalled();
    });
  });
});
```

Run: `npm test -- QuizModal`

---

## Task 5: Add CSS Styles ✅ COMPLETED

### 5.1 What to Build

Styles for all new components. Add to your existing quiz styles file.

### 5.2 Implementation

Add to `src/components/quiz/quiz.css` (or create):

```css
/* Question Type Badges */
.question-type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #e0e0e0;
  color: #333;
}

.difficulty-badge {
  margin-left: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.difficulty-badge.easy { background: #c8e6c9; color: #2e7d32; }
.difficulty-badge.medium { background: #fff3e0; color: #ef6c00; }
.difficulty-badge.hard { background: #ffcdd2; color: #c62828; }

/* Short Answer */
.short-answer-question .answer-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  min-height: 100px;
}

.short-answer-question .answer-input:focus {
  outline: none;
  border-color: #2196f3;
}

/* Fill in Blank */
.fill-in-blank-question .sentence {
  font-size: 16px;
  line-height: 1.6;
  margin: 16px 0;
}

.fill-in-blank-question .blank-indicator {
  background: #fff3e0;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
}

.fill-in-blank-question .answer-row {
  display: flex;
  gap: 8px;
}

.fill-in-blank-question .blank-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

/* Self Assessment Feedback */
.self-assessment-feedback {
  padding: 16px;
}

.result-banner {
  padding: 12px;
  border-radius: 4px;
  text-align: center;
  font-weight: bold;
  margin-bottom: 16px;
}

.result-banner.correct { background: #c8e6c9; color: #2e7d32; }
.result-banner.incorrect { background: #ffcdd2; color: #c62828; }

.answer-section {
  margin-bottom: 16px;
}

.answer-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.user-answer, .ideal-answer, .correct-answers {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.rubric-section ul {
  padding-left: 20px;
}

.evidence {
  border-left: 3px solid #2196f3;
  padding-left: 12px;
  margin: 8px 0;
  font-style: italic;
  color: #555;
}

/* Rating Buttons */
.rating-section h4 {
  margin-bottom: 12px;
}

.rating-buttons {
  display: flex;
  gap: 8px;
}

.rating-button {
  flex: 1;
  padding: 12px 8px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.1s;
}

.rating-button:hover {
  transform: scale(1.05);
}

.rating-label {
  font-weight: bold;
  font-size: 14px;
}

.rating-description {
  font-size: 11px;
  opacity: 0.8;
}

.rating-again { background: #ffcdd2; color: #c62828; }
.rating-hard { background: #ffe0b2; color: #ef6c00; }
.rating-good { background: #c8e6c9; color: #2e7d32; }
.rating-easy { background: #bbdefb; color: #1565c0; }

/* Context hint */
.context-hint {
  color: #666;
  font-size: 14px;
  font-style: italic;
  margin: 8px 0;
}

/* Submit button */
.submit-button {
  padding: 12px 24px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 12px;
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.submit-button:hover:not(:disabled) {
  background: #1976d2;
}
```

### 5.3 Verification

Visual verification - run the app and confirm:
1. Short answer textarea has proper styling
2. Fill-in-blank has inline blank indicator
3. Rating buttons have distinct colors
4. Correct/incorrect banners are visible

---

## Task 6: Update Type Definitions ✅ COMPLETED

### 6.1 What to Build

Ensure TypeScript types match the data models.

### 6.2 Implementation

Update `src/types/index.ts` (or create):

```typescript
export interface Question {
  id: string;
  document: string;
  session?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'fill_in_blank';
  comprehension_type: 'factual_recall' | 'inference' | 'synthesis';
  difficulty?: 'easy' | 'medium' | 'hard';

  // Multiple choice
  options?: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  distractor_explanations?: { A: string; B: string; C: string; D: string };

  // Short answer
  ideal_answer?: string;
  acceptable_variations?: string[];
  required_concepts?: string[];
  scoring_rubric?: {
    full_credit: string;
    partial_credit: string;
    no_credit: string;
  };

  // Fill-in-blank
  sentence_with_blank?: string;
  correct_answers?: string[];
  context_hint?: string;

  // Common
  rationale: string;
  passage_evidence?: string;
  passage_location?: string;
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
```

### 6.3 Verification

Run: `npm run typecheck` (or `npx tsc --noEmit`)

Should complete with no errors.

---

## End-to-End Validation

After completing all tasks, verify the complete flow works:

### Manual Test Steps

1. **Start the application** with PocketBase running

2. **Create a test document** and start a reading session

3. **Generate questions** that include all three types (you may need to manually insert test data or prompt the AI to generate diverse types)

4. **Test MCQ flow** (should work from Phase 2):
   - Answer correctly → see feedback → rate
   - Answer incorrectly → see feedback → rate

5. **Test Short Answer flow**:
   - Type an answer → submit
   - See model answer and scoring rubric
   - Self-assess with rating buttons
   - Verify attempt recorded in PocketBase

6. **Test Fill-in-Blank flow**:
   - Type correct answer → see "Correct!" banner
   - Rate difficulty
   - Repeat with incorrect answer → see "Incorrect" banner
   - Verify attempts recorded

7. **Verify database records**:
   ```bash
   # Check attempts were created with correct data
   curl "http://127.0.0.1:8090/api/collections/question_attempts/records" | jq
   ```

   Verify each attempt has:
   - `user_answer` populated
   - `is_correct` set appropriately
   - `rating` between 1-4
   - `time_spent_ms` reasonable value
   - FSRS fields populated by hook (`stability`, `difficulty`, `due_at`)

### Automated Integration Test

Create `src/__tests__/quiz-flow.integration.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PocketBase from 'pocketbase';
import { QuizModal } from '../components/quiz/QuizModal';

// This test requires PocketBase running locally
describe.skipIf(!process.env.INTEGRATION)('Quiz Flow Integration', () => {
  let pb: PocketBase;
  let testQuestions: any[];

  beforeAll(async () => {
    pb = new PocketBase('http://127.0.0.1:8090');

    // Create test questions
    const doc = await pb.collection('documents').create({
      title: 'Test Doc',
      content: 'Test content',
      source_type: 'paste',
      word_count: 2,
    });

    testQuestions = await Promise.all([
      pb.collection('questions').create({
        document: doc.id,
        question_type: 'short_answer',
        question_text: 'Test short answer',
        comprehension_type: 'inference',
        ideal_answer: 'Test ideal',
        rationale: 'Test rationale',
        correct_answer: 'Test ideal',
      }),
      pb.collection('questions').create({
        document: doc.id,
        question_type: 'fill_in_blank',
        question_text: 'Fill blank',
        comprehension_type: 'factual_recall',
        sentence_with_blank: 'Answer is _____.',
        correct_answers: ['test'],
        rationale: 'Test rationale',
        correct_answer: 'test',
      }),
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    for (const q of testQuestions) {
      await pb.collection('questions').delete(q.id);
    }
  });

  it('records attempts for all question types', async () => {
    const handleComplete = vi.fn();

    render(
      <QuizModal
        questions={testQuestions}
        onClose={() => {}}
        onComplete={handleComplete}
        pb={pb}
      />
    );

    // Answer short answer
    fireEvent.change(screen.getByPlaceholderText(/Type your answer/), {
      target: { value: 'My test answer' }
    });
    fireEvent.click(screen.getByText('Submit Answer'));
    fireEvent.click(screen.getByText('Good'));

    // Wait for next question
    await waitFor(() => {
      expect(screen.getByText(/Answer is/)).toBeInTheDocument();
    });

    // Answer fill-in-blank
    fireEvent.change(screen.getByPlaceholderText(/Fill in/), {
      target: { value: 'test' }
    });
    fireEvent.click(screen.getByText('Check'));
    fireEvent.click(screen.getByText('Easy'));

    await waitFor(() => {
      expect(handleComplete).toHaveBeenCalled();
    });

    // Verify attempts in database
    const attempts = await pb.collection('question_attempts').getList(1, 10, {
      filter: `question = "${testQuestions[0].id}" || question = "${testQuestions[1].id}"`,
    });

    expect(attempts.items).toHaveLength(2);
    expect(attempts.items[0].rating).toBeDefined();
    expect(attempts.items[0].due_at).toBeDefined(); // FSRS hook ran
  });
});
```

Run integration test: `INTEGRATION=1 npm test -- quiz-flow.integration`

---

## Checklist

Before considering Phase 3 complete:

- [ ] ShortAnswerQuestion component renders and accepts input
- [ ] FillInBlankQuestion component checks answers correctly (case-insensitive)
- [ ] SelfAssessmentFeedback shows appropriate content for each question type
- [ ] Rating buttons trigger correct FSRS rating values
- [ ] QuizModal routes to correct component by question_type
- [ ] Question attempts recorded to PocketBase with all fields
- [ ] FSRS hook populates `due_at`, `stability`, `difficulty` on attempts
- [ ] All unit tests pass
- [ ] TypeScript compiles without errors
- [ ] Manual testing confirms visual styling is correct

---

## Files Created/Modified

| File | Action |
|------|--------|
| `src/components/quiz/ShortAnswerQuestion.tsx` | Create |
| `src/components/quiz/FillInBlankQuestion.tsx` | Create |
| `src/components/quiz/SelfAssessmentFeedback.tsx` | Create |
| `src/components/quiz/QuizModal.tsx` | Modify |
| `src/components/quiz/quiz.css` | Modify |
| `src/types/index.ts` | Modify |
| `src/components/quiz/__tests__/*.test.tsx` | Create |
