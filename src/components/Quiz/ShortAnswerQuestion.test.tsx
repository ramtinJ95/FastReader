import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ShortAnswerQuestion } from './ShortAnswerQuestion';
import type { Question } from '../../types';

const mockQuestion: Question = {
  id: 'q1',
  document: 'doc1',
  question_text: 'Explain the main theme of the passage.',
  question_type: 'short_answer',
  comprehension_type: 'inference',
  ideal_answer: 'The main theme is the struggle between tradition and progress.',
  rationale: 'The author repeatedly contrasts old and new ways.',
  correct_answer: 'The main theme is the struggle between tradition and progress.',
  difficulty: 'medium',
  created: '2024-01-01T00:00:00Z',
};

const mockQuestionWithHint: Question = {
  ...mockQuestion,
  id: 'q2',
  context_hint: 'Consider the central conflict described in paragraph 3.',
};

describe('ShortAnswerQuestion', () => {
  it('renders question text', () => {
    render(<ShortAnswerQuestion question={mockQuestion} onAnswer={() => {}} />);
    expect(screen.getByText(/Explain the main theme/)).toBeInTheDocument();
  });

  it('renders textarea with placeholder', () => {
    render(<ShortAnswerQuestion question={mockQuestion} onAnswer={() => {}} />);
    expect(
      screen.getByPlaceholderText(/Type your answer/)
    ).toBeInTheDocument();
  });

  it('calls onAnswer with trimmed answer when submitted', () => {
    const handleAnswer = vi.fn();
    render(
      <ShortAnswerQuestion question={mockQuestion} onAnswer={handleAnswer} />
    );

    fireEvent.change(screen.getByPlaceholderText(/Type your answer/), {
      target: { value: '  My answer here  ' },
    });
    fireEvent.click(screen.getByText('Submit Answer'));

    expect(handleAnswer).toHaveBeenCalledWith('My answer here');
  });

  it('disables submit button when answer is empty', () => {
    render(<ShortAnswerQuestion question={mockQuestion} onAnswer={() => {}} />);
    expect(screen.getByText('Submit Answer')).toBeDisabled();
  });

  it('disables submit button when answer is only whitespace', () => {
    render(<ShortAnswerQuestion question={mockQuestion} onAnswer={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Type your answer/), {
      target: { value: '   ' },
    });

    expect(screen.getByText('Submit Answer')).toBeDisabled();
  });

  it('enables submit button when answer has content', () => {
    render(<ShortAnswerQuestion question={mockQuestion} onAnswer={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Type your answer/), {
      target: { value: 'Some answer' },
    });

    expect(screen.getByText('Submit Answer')).not.toBeDisabled();
  });

  it('disables textarea when disabled prop is true', () => {
    render(
      <ShortAnswerQuestion
        question={mockQuestion}
        onAnswer={() => {}}
        disabled
      />
    );
    expect(screen.getByPlaceholderText(/Type your answer/)).toBeDisabled();
  });

  it('disables submit button when disabled prop is true', () => {
    render(
      <ShortAnswerQuestion
        question={mockQuestion}
        onAnswer={() => {}}
        disabled
      />
    );
    expect(screen.getByText('Submit Answer')).toBeDisabled();
  });

  it('shows context hint when provided', () => {
    render(
      <ShortAnswerQuestion question={mockQuestionWithHint} onAnswer={() => {}} />
    );
    expect(screen.getByText(/Hint:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Consider the central conflict/)
    ).toBeInTheDocument();
  });

  it('does not show context hint when not provided', () => {
    render(<ShortAnswerQuestion question={mockQuestion} onAnswer={() => {}} />);
    expect(screen.queryByText(/Hint:/)).not.toBeInTheDocument();
  });
});
