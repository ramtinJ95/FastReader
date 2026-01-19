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

  it('shows error message when no options provided', () => {
    const questionWithoutOptions: Question = {
      ...mockQuestion,
      options: undefined,
    };
    render(<MCQQuestion question={questionWithoutOptions} onAnswer={vi.fn()} />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
