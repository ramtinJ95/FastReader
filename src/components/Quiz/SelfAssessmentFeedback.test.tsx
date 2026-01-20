import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SelfAssessmentFeedback } from './SelfAssessmentFeedback';
import type { Question } from '../../types';

const shortAnswerQuestion: Question = {
  id: 'q1',
  document: 'doc1',
  question_type: 'short_answer',
  question_text: 'Explain the theme.',
  comprehension_type: 'inference',
  ideal_answer: 'The theme is about change.',
  rationale: 'Multiple passages reference transformation.',
  correct_answer: 'The theme is about change.',
  scoring_rubric: {
    full_credit: 'Mentions change and provides example',
    partial_credit: 'Mentions change without example',
    no_credit: 'Misidentifies theme',
  },
  created: new Date().toISOString(),
};

const fillInBlankQuestion: Question = {
  id: 'q2',
  document: 'doc1',
  question_type: 'fill_in_blank',
  question_text: 'Fill blank',
  comprehension_type: 'factual_recall',
  sentence_with_blank: 'The answer is _____.',
  correct_answers: ['correct', 'right'],
  rationale: 'Stated in paragraph 2.',
  correct_answer: 'correct',
  created: new Date().toISOString(),
};

const shortAnswerWithEvidence: Question = {
  ...shortAnswerQuestion,
  id: 'q3',
  passage_evidence: 'The winds of change swept through the village.',
};

describe('SelfAssessmentFeedback', () => {
  it('shows model answer for short answer questions', () => {
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My answer"
        hasRated={false}
        onRating={() => {}}
      />
    );

    expect(screen.getByText('Model Answer:')).toBeInTheDocument();
    expect(screen.getByText('The theme is about change.')).toBeInTheDocument();
  });

  it('shows correct banner for fill-in-blank when correct', () => {
    render(
      <SelfAssessmentFeedback
        question={fillInBlankQuestion}
        userAnswer="correct"
        isCorrect={true}
        hasRated={false}
        onRating={() => {}}
      />
    );

    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows incorrect banner for fill-in-blank when incorrect', () => {
    render(
      <SelfAssessmentFeedback
        question={fillInBlankQuestion}
        userAnswer="wrong"
        isCorrect={false}
        hasRated={false}
        onRating={() => {}}
      />
    );

    expect(screen.getByText('Incorrect')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('shows correct answers for fill-in-blank', () => {
    render(
      <SelfAssessmentFeedback
        question={fillInBlankQuestion}
        userAnswer="wrong"
        isCorrect={false}
        hasRated={false}
        onRating={() => {}}
      />
    );

    expect(screen.getByText('Correct Answer(s):')).toBeInTheDocument();
    expect(screen.getByText('correct, right')).toBeInTheDocument();
  });

  it('shows scoring rubric for short answer', () => {
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My answer"
        hasRated={false}
        onRating={() => {}}
      />
    );

    expect(screen.getByText('Scoring Guide:')).toBeInTheDocument();
    expect(screen.getByText(/Full credit:/)).toBeInTheDocument();
    expect(screen.getByText(/Partial credit:/)).toBeInTheDocument();
    expect(screen.getByText(/No credit:/)).toBeInTheDocument();
  });

  it('shows user answer', () => {
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My test answer"
        hasRated={false}
        onRating={() => {}}
      />
    );

    expect(screen.getByText('Your Answer:')).toBeInTheDocument();
    expect(screen.getByText('My test answer')).toBeInTheDocument();
  });

  it('shows explanation/rationale', () => {
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My answer"
        hasRated={false}
        onRating={() => {}}
      />
    );

    expect(screen.getByText('Explanation:')).toBeInTheDocument();
    expect(
      screen.getByText('Multiple passages reference transformation.')
    ).toBeInTheDocument();
  });

  it('shows passage evidence when available', () => {
    render(
      <SelfAssessmentFeedback
        question={shortAnswerWithEvidence}
        userAnswer="My answer"
        hasRated={false}
        onRating={() => {}}
      />
    );

    expect(
      screen.getByText(/"The winds of change swept through the village."/)
    ).toBeInTheDocument();
  });

  it('calls onRating with correct value when rating button clicked', () => {
    const handleRate = vi.fn();
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My answer"
        hasRated={false}
        onRating={handleRate}
      />
    );

    fireEvent.click(screen.getByText('Good'));
    expect(handleRate).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByText('Again'));
    expect(handleRate).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByText('Hard'));
    expect(handleRate).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByText('Easy'));
    expect(handleRate).toHaveBeenCalledWith(4);
  });

  it('displays all four rating options', () => {
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My answer"
        hasRated={false}
        onRating={() => {}}
      />
    );

    expect(screen.getByText('Again')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('hides rating buttons when hasRated is true', () => {
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My answer"
        hasRated={true}
        onRating={() => {}}
      />
    );

    expect(screen.queryByText('How well did you know this?')).not.toBeInTheDocument();
    expect(screen.queryByText('Again')).not.toBeInTheDocument();
  });

  it('shows compare your answer header for short answer', () => {
    render(
      <SelfAssessmentFeedback
        question={shortAnswerQuestion}
        userAnswer="My answer"
        hasRated={false}
        onRating={() => {}}
      />
    );

    expect(screen.getByText('Compare Your Answer')).toBeInTheDocument();
  });
});
