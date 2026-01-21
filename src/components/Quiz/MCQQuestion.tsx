import { useState, useCallback, useMemo } from 'react';
import type { Question } from '../../types';

export interface MCQQuestionProps {
  question: Question;
  onAnswer: (answer: string) => void;
}

/**
 * Seeded random number generator for consistent shuffling
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

/**
 * Shuffle array using Fisher-Yates with seeded random
 */
function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const result = [...array];
  const random = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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

  // Shuffle options consistently based on question ID
  const shuffledOptions = useMemo(() => {
    if (!question.options) return [];
    const entries = Object.entries(question.options) as [string, string][];
    return shuffleWithSeed(entries, question.id);
  }, [question.options, question.id]);

  if (!question.options) {
    return <p>Error: No options provided for this question.</p>;
  }

  return (
    <div className="mcq-question">
      <p className="question-text">{question.question_text}</p>

      <div className="mcq-options" role="radiogroup" aria-label="Answer options">
        {shuffledOptions.map(([key, value]) => (
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
