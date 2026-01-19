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

  it('calls onRating with correct value for each button', async () => {
    const user = userEvent.setup();
    const onRating = vi.fn();
    const { rerender } = render(
      <QuizFeedback
        question={mockQuestion}
        userAnswer="B"
        isCorrect={true}
        hasRated={false}
        onRating={onRating}
      />
    );

    await user.click(screen.getByRole('button', { name: /again/i }));
    expect(onRating).toHaveBeenCalledWith(1);

    onRating.mockClear();
    rerender(
      <QuizFeedback
        question={mockQuestion}
        userAnswer="B"
        isCorrect={true}
        hasRated={false}
        onRating={onRating}
      />
    );

    await user.click(screen.getByRole('button', { name: /hard/i }));
    expect(onRating).toHaveBeenCalledWith(2);

    onRating.mockClear();
    rerender(
      <QuizFeedback
        question={mockQuestion}
        userAnswer="B"
        isCorrect={true}
        hasRated={false}
        onRating={onRating}
      />
    );

    await user.click(screen.getByRole('button', { name: /easy/i }));
    expect(onRating).toHaveBeenCalledWith(4);
  });
});
