import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FillInBlankQuestion } from './FillInBlankQuestion';
import type { Question } from '../../types';

const mockQuestion: Question = {
  id: 'q1',
  document: 'doc1',
  question_text: 'Fill in the blank',
  question_type: 'fill_in_blank',
  comprehension_type: 'factual_recall',
  sentence_with_blank: 'The Industrial Revolution began in _____.',
  correct_answers: ['England', 'Britain', 'Great Britain'],
  rationale: 'The passage states the revolution started in England.',
  correct_answer: 'England',
  created: '2024-01-01T00:00:00Z',
};

const mockQuestionWithHint: Question = {
  ...mockQuestion,
  id: 'q2',
  context_hint: 'Think about which country is mentioned in paragraph 1.',
};

const mockQuestionWithoutBlank: Question = {
  ...mockQuestion,
  id: 'q3',
  sentence_with_blank: undefined,
  question_text: 'Where did the Industrial Revolution begin?',
};

describe('FillInBlankQuestion', () => {
  it('renders sentence with blank indicator', () => {
    render(<FillInBlankQuestion question={mockQuestion} onAnswer={() => {}} />);
    expect(screen.getByText(/Industrial Revolution/)).toBeInTheDocument();
    expect(screen.getByText('[_____]')).toBeInTheDocument();
  });

  it('renders question text when no sentence_with_blank provided', () => {
    render(
      <FillInBlankQuestion
        question={mockQuestionWithoutBlank}
        onAnswer={() => {}}
      />
    );
    expect(
      screen.getByText('Where did the Industrial Revolution begin?')
    ).toBeInTheDocument();
  });

  it('marks correct answer as correct (case-insensitive)', () => {
    const handleAnswer = vi.fn();
    render(
      <FillInBlankQuestion question={mockQuestion} onAnswer={handleAnswer} />
    );

    fireEvent.change(screen.getByPlaceholderText(/Fill in/), {
      target: { value: 'england' },
    });
    fireEvent.click(screen.getByText('Check'));

    expect(handleAnswer).toHaveBeenCalledWith('england', true);
  });

  it('marks alternative correct answer as correct', () => {
    const handleAnswer = vi.fn();
    render(
      <FillInBlankQuestion question={mockQuestion} onAnswer={handleAnswer} />
    );

    fireEvent.change(screen.getByPlaceholderText(/Fill in/), {
      target: { value: 'Britain' },
    });
    fireEvent.click(screen.getByText('Check'));

    expect(handleAnswer).toHaveBeenCalledWith('Britain', true);
  });

  it('marks incorrect answer as incorrect', () => {
    const handleAnswer = vi.fn();
    render(
      <FillInBlankQuestion question={mockQuestion} onAnswer={handleAnswer} />
    );

    fireEvent.change(screen.getByPlaceholderText(/Fill in/), {
      target: { value: 'France' },
    });
    fireEvent.click(screen.getByText('Check'));

    expect(handleAnswer).toHaveBeenCalledWith('France', false);
  });

  it('trims whitespace from answer', () => {
    const handleAnswer = vi.fn();
    render(
      <FillInBlankQuestion question={mockQuestion} onAnswer={handleAnswer} />
    );

    fireEvent.change(screen.getByPlaceholderText(/Fill in/), {
      target: { value: '  England  ' },
    });
    fireEvent.click(screen.getByText('Check'));

    expect(handleAnswer).toHaveBeenCalledWith('England', true);
  });

  it('submits on Enter key', () => {
    const handleAnswer = vi.fn();
    render(
      <FillInBlankQuestion question={mockQuestion} onAnswer={handleAnswer} />
    );

    const input = screen.getByPlaceholderText(/Fill in/);
    fireEvent.change(input, { target: { value: 'England' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleAnswer).toHaveBeenCalledWith('England', true);
  });

  it('does not submit on Enter when answer is empty', () => {
    const handleAnswer = vi.fn();
    render(
      <FillInBlankQuestion question={mockQuestion} onAnswer={handleAnswer} />
    );

    const input = screen.getByPlaceholderText(/Fill in/);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleAnswer).not.toHaveBeenCalled();
  });

  it('disables Check button when answer is empty', () => {
    render(<FillInBlankQuestion question={mockQuestion} onAnswer={() => {}} />);
    expect(screen.getByText('Check')).toBeDisabled();
  });

  it('disables Check button when answer is only whitespace', () => {
    render(<FillInBlankQuestion question={mockQuestion} onAnswer={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Fill in/), {
      target: { value: '   ' },
    });

    expect(screen.getByText('Check')).toBeDisabled();
  });

  it('enables Check button when answer has content', () => {
    render(<FillInBlankQuestion question={mockQuestion} onAnswer={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Fill in/), {
      target: { value: 'test' },
    });

    expect(screen.getByText('Check')).not.toBeDisabled();
  });

  it('disables input when disabled prop is true', () => {
    render(
      <FillInBlankQuestion
        question={mockQuestion}
        onAnswer={() => {}}
        disabled
      />
    );
    expect(screen.getByPlaceholderText(/Fill in/)).toBeDisabled();
  });

  it('disables Check button when disabled prop is true', () => {
    render(
      <FillInBlankQuestion
        question={mockQuestion}
        onAnswer={() => {}}
        disabled
      />
    );
    expect(screen.getByText('Check')).toBeDisabled();
  });

  it('shows context hint when provided', () => {
    render(
      <FillInBlankQuestion
        question={mockQuestionWithHint}
        onAnswer={() => {}}
      />
    );
    expect(screen.getByText(/Hint:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Think about which country/)
    ).toBeInTheDocument();
  });

  it('does not show context hint when not provided', () => {
    render(<FillInBlankQuestion question={mockQuestion} onAnswer={() => {}} />);
    expect(screen.queryByText(/Hint:/)).not.toBeInTheDocument();
  });
});
