import { useState, useCallback } from 'react';
import type { Question } from '../../types';
import { fuzzyMatchAnswer } from '../../lib/string-matching';

export interface FillInBlankQuestionProps {
  question: Question;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  disabled?: boolean;
}

export function FillInBlankQuestion({
  question,
  onAnswer,
  disabled,
}: FillInBlankQuestionProps) {
  const [answer, setAnswer] = useState('');

  const checkAnswer = useCallback(
    (userAnswer: string): boolean => {
      const correctAnswers = question.correct_answers || [question.correct_answer];
      const result = fuzzyMatchAnswer(userAnswer, correctAnswers, {
        minSimilarity: 85,
        maxDistance: 2,
        ignoreCase: true,
      });
      return result.isMatch;
    },
    [question.correct_answers, question.correct_answer]
  );

  const handleSubmit = useCallback(() => {
    if (answer.trim()) {
      const isCorrect = checkAnswer(answer);
      onAnswer(answer.trim(), isCorrect);
    }
  }, [answer, onAnswer, checkAnswer]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && answer.trim()) {
        handleSubmit();
      }
    },
    [answer, handleSubmit]
  );

  // Render sentence with blank highlighted
  const renderSentence = () => {
    const sentence = question.sentence_with_blank || question.question_text;
    const parts = sentence.split('_____');

    if (parts.length === 1) {
      return <p className="fill-blank-sentence">{sentence}</p>;
    }

    return (
      <p className="fill-blank-sentence">
        {parts[0]}
        <span className="blank-indicator">[_____]</span>
        {parts[1]}
      </p>
    );
  };

  return (
    <div className="fill-in-blank-question">
      {renderSentence()}

      {question.context_hint && (
        <p className="context-hint">Hint: {question.context_hint}</p>
      )}

      <div className="fill-blank-answer-row">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Fill in the blank..."
          disabled={disabled}
          className="fill-blank-input"
          onKeyDown={handleKeyDown}
          aria-label="Fill in the blank"
        />
        <button
          className="btn primary"
          onClick={handleSubmit}
          disabled={disabled || !answer.trim()}
        >
          Check
        </button>
      </div>
    </div>
  );
}
