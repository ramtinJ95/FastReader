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
