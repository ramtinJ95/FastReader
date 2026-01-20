import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizModal } from './QuizModal';
import type { Question, QuizState } from '../../types';

const createMockQuestion = (overrides: Partial<Question> = {}): Question => ({
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
  rationale: 'Because the text clearly states this.',
  created: '2026-01-18',
  ...overrides,
});

const createMockQuiz = (overrides: Partial<QuizState> = {}): QuizState => ({
  questions: [createMockQuestion()],
  currentIndex: 0,
  answers: new Map(),
  isGenerating: false,
  ...overrides,
});

describe('QuizModal', () => {
  const defaultProps = {
    quiz: createMockQuiz(),
    onAnswer: vi.fn(),
    onRating: vi.fn(),
    onNext: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders quiz modal with title', () => {
      render(<QuizModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Quiz')).toBeInTheDocument();
    });

    it('shows question progress', () => {
      render(<QuizModal {...defaultProps} />);
      expect(screen.getByText('Question 1 of 1')).toBeInTheDocument();
    });

    it('shows comprehension type badge', () => {
      render(<QuizModal {...defaultProps} />);
      expect(screen.getByText('Inference')).toBeInTheDocument();
    });

    it('renders question text', () => {
      render(<QuizModal {...defaultProps} />);
      expect(screen.getByText('What is the main idea?')).toBeInTheDocument();
    });

    it('renders all MCQ options', () => {
      render(<QuizModal {...defaultProps} />);
      expect(screen.getByText('First option')).toBeInTheDocument();
      expect(screen.getByText('Second option')).toBeInTheDocument();
      expect(screen.getByText('Third option')).toBeInTheDocument();
      expect(screen.getByText('Fourth option')).toBeInTheDocument();
    });

    it('returns null when no current question', () => {
      const quiz = createMockQuiz({ questions: [] });
      const { container } = render(<QuizModal {...defaultProps} quiz={quiz} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('answering questions', () => {
    it('calls onAnswer when submitting an answer', async () => {
      const user = userEvent.setup();
      const onAnswer = vi.fn();
      render(<QuizModal {...defaultProps} onAnswer={onAnswer} />);

      await user.click(screen.getByText('First option'));
      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(onAnswer).toHaveBeenCalledWith('q1', 'A');
    });

    it('shows feedback after answering', async () => {
      const quiz = createMockQuiz({
        answers: new Map([['q1', { answer: 'B', isCorrect: true }]]),
      });
      render(<QuizModal {...defaultProps} quiz={quiz} />);

      expect(screen.getByText('Correct!')).toBeInTheDocument();
      expect(screen.getByText('Because the text clearly states this.')).toBeInTheDocument();
    });

    it('shows incorrect feedback with correct answer', async () => {
      const quiz = createMockQuiz({
        answers: new Map([['q1', { answer: 'A', isCorrect: false }]]),
      });
      render(<QuizModal {...defaultProps} quiz={quiz} />);

      expect(screen.getByText('Incorrect')).toBeInTheDocument();
      expect(screen.getByText(/Your answer:/)).toBeInTheDocument();
      expect(screen.getByText(/Correct answer:/)).toBeInTheDocument();
    });
  });

  describe('rating questions', () => {
    it('shows rating buttons after answering', () => {
      const quiz = createMockQuiz({
        answers: new Map([['q1', { answer: 'B', isCorrect: true }]]),
      });
      render(<QuizModal {...defaultProps} quiz={quiz} />);

      expect(screen.getByRole('button', { name: /again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /good/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /easy/i })).toBeInTheDocument();
    });

    it('calls onRating when rating button clicked', async () => {
      const user = userEvent.setup();
      const onRating = vi.fn();
      const quiz = createMockQuiz({
        answers: new Map([['q1', { answer: 'B', isCorrect: true }]]),
      });
      render(<QuizModal {...defaultProps} quiz={quiz} onRating={onRating} />);

      await user.click(screen.getByRole('button', { name: /good/i }));

      expect(onRating).toHaveBeenCalledWith('q1', 3);
    });

    it('hides rating buttons after rating', () => {
      const quiz = createMockQuiz({
        answers: new Map([['q1', { answer: 'B', isCorrect: true, rating: 3 }]]),
      });
      render(<QuizModal {...defaultProps} quiz={quiz} />);

      expect(screen.queryByRole('button', { name: /again/i })).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('shows Next Question button after rating', () => {
      const quiz = createMockQuiz({
        questions: [createMockQuestion(), createMockQuestion({ id: 'q2' })],
        answers: new Map([['q1', { answer: 'B', isCorrect: true, rating: 3 }]]),
      });
      render(<QuizModal {...defaultProps} quiz={quiz} />);

      expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
    });

    it('calls onNext when Next Question clicked', async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      const quiz = createMockQuiz({
        questions: [createMockQuestion(), createMockQuestion({ id: 'q2' })],
        answers: new Map([['q1', { answer: 'B', isCorrect: true, rating: 3 }]]),
      });
      render(<QuizModal {...defaultProps} quiz={quiz} onNext={onNext} />);

      await user.click(screen.getByRole('button', { name: /next question/i }));

      expect(onNext).toHaveBeenCalled();
    });

    it('shows Finish button on last question', () => {
      const quiz = createMockQuiz({
        answers: new Map([['q1', { answer: 'B', isCorrect: true, rating: 3 }]]),
      });
      render(<QuizModal {...defaultProps} quiz={quiz} />);

      expect(screen.getByRole('button', { name: /finish/i })).toBeInTheDocument();
    });

    it('calls onClose when Finish clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const quiz = createMockQuiz({
        answers: new Map([['q1', { answer: 'B', isCorrect: true, rating: 3 }]]),
      });
      render(<QuizModal {...defaultProps} quiz={quiz} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /finish/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('closing', () => {
    it('calls onClose when close button clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<QuizModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /close quiz/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking overlay', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<QuizModal {...defaultProps} onClose={onClose} />);

      // Click the overlay (the parent div with dialog-overlay class)
      const overlay = screen.getByRole('dialog').parentElement!;
      await user.click(overlay);

      expect(onClose).toHaveBeenCalled();
    });

    it('does not call onClose when clicking inside dialog', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<QuizModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('dialog'));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('prevents close when generating', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const quiz = createMockQuiz({ isGenerating: true });
      render(<QuizModal {...defaultProps} quiz={quiz} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /close quiz/i }));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('complete quiz flow', () => {
    it('supports full quiz flow: answer -> feedback -> rate -> next -> finish', async () => {
      const user = userEvent.setup();
      const onAnswer = vi.fn();
      const onRating = vi.fn();
      const onNext = vi.fn();
      const onClose = vi.fn();

      // Start with two questions, no answers
      const questions = [
        createMockQuestion({ id: 'q1', question_text: 'First question?' }),
        createMockQuestion({ id: 'q2', question_text: 'Second question?' }),
      ];

      // Question 1: Unanswered state
      const { rerender } = render(
        <QuizModal
          quiz={createMockQuiz({ questions, currentIndex: 0 })}
          onAnswer={onAnswer}
          onRating={onRating}
          onNext={onNext}
          onClose={onClose}
        />
      );

      // Verify question 1 is shown
      expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('First question?')).toBeInTheDocument();

      // Answer question 1
      await user.click(screen.getByText('Second option'));
      await user.click(screen.getByRole('button', { name: /submit/i }));
      expect(onAnswer).toHaveBeenCalledWith('q1', 'B');

      // Rerender with answer recorded (simulating state update)
      rerender(
        <QuizModal
          quiz={createMockQuiz({
            questions,
            currentIndex: 0,
            answers: new Map([['q1', { answer: 'B', isCorrect: true }]]),
          })}
          onAnswer={onAnswer}
          onRating={onRating}
          onNext={onNext}
          onClose={onClose}
        />
      );

      // Verify feedback shown
      expect(screen.getByText('Correct!')).toBeInTheDocument();

      // Rate the question
      await user.click(screen.getByRole('button', { name: /good/i }));
      expect(onRating).toHaveBeenCalledWith('q1', 3);

      // Rerender with rating recorded
      rerender(
        <QuizModal
          quiz={createMockQuiz({
            questions,
            currentIndex: 0,
            answers: new Map([['q1', { answer: 'B', isCorrect: true, rating: 3 }]]),
          })}
          onAnswer={onAnswer}
          onRating={onRating}
          onNext={onNext}
          onClose={onClose}
        />
      );

      // Verify Next Question button appears and click it
      await user.click(screen.getByRole('button', { name: /next question/i }));
      expect(onNext).toHaveBeenCalled();

      // Rerender at question 2
      rerender(
        <QuizModal
          quiz={createMockQuiz({
            questions,
            currentIndex: 1,
            answers: new Map([['q1', { answer: 'B', isCorrect: true, rating: 3 }]]),
          })}
          onAnswer={onAnswer}
          onRating={onRating}
          onNext={onNext}
          onClose={onClose}
        />
      );

      // Verify question 2 is shown
      expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
      expect(screen.getByText('Second question?')).toBeInTheDocument();

      // Answer question 2
      await user.click(screen.getByText('First option'));
      await user.click(screen.getByRole('button', { name: /submit/i }));
      expect(onAnswer).toHaveBeenCalledWith('q2', 'A');

      // Rerender with answer recorded (wrong answer)
      rerender(
        <QuizModal
          quiz={createMockQuiz({
            questions,
            currentIndex: 1,
            answers: new Map([
              ['q1', { answer: 'B', isCorrect: true, rating: 3 }],
              ['q2', { answer: 'A', isCorrect: false }],
            ]),
          })}
          onAnswer={onAnswer}
          onRating={onRating}
          onNext={onNext}
          onClose={onClose}
        />
      );

      // Verify incorrect feedback
      expect(screen.getByText('Incorrect')).toBeInTheDocument();

      // Rate the question
      await user.click(screen.getByRole('button', { name: /hard/i }));
      expect(onRating).toHaveBeenCalledWith('q2', 2);

      // Rerender with rating recorded (last question)
      rerender(
        <QuizModal
          quiz={createMockQuiz({
            questions,
            currentIndex: 1,
            answers: new Map([
              ['q1', { answer: 'B', isCorrect: true, rating: 3 }],
              ['q2', { answer: 'A', isCorrect: false, rating: 2 }],
            ]),
          })}
          onAnswer={onAnswer}
          onRating={onRating}
          onNext={onNext}
          onClose={onClose}
        />
      );

      // Verify Finish button appears on last question
      await user.click(screen.getByRole('button', { name: /finish/i }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('question type rendering', () => {
    it('renders ShortAnswerQuestion for short answer questions', () => {
      const quiz = createMockQuiz({
        questions: [createMockQuestion({ question_type: 'short_answer' })],
      });
      render(<QuizModal {...defaultProps} quiz={quiz} />);

      expect(screen.getByPlaceholderText(/Type your answer/i)).toBeInTheDocument();
      expect(screen.queryByText(/will be supported in a future update/i)).not.toBeInTheDocument();
    });

    it('shows placeholder for fill-in-blank questions', () => {
      const quiz = createMockQuiz({
        questions: [createMockQuestion({ question_type: 'fill_in_blank' })],
      });
      render(<QuizModal {...defaultProps} quiz={quiz} />);

      expect(screen.getByText(/will be supported in a future update/i)).toBeInTheDocument();
    });
  });
});
