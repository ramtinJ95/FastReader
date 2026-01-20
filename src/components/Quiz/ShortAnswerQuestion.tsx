import { useState, useCallback } from 'react';
import type { Question } from '../../types';

export interface ShortAnswerQuestionProps {
  question: Question;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

export function ShortAnswerQuestion({
  question,
  onAnswer,
  disabled,
}: ShortAnswerQuestionProps) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = useCallback(() => {
    if (answer.trim()) {
      onAnswer(answer.trim());
    }
  }, [answer, onAnswer]);

  return (
    <div className="short-answer-question">
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
        className="short-answer-input"
        aria-label="Your answer"
      />

      <button
        className="btn primary"
        onClick={handleSubmit}
        disabled={disabled || !answer.trim()}
      >
        Submit Answer
      </button>
    </div>
  );
}
