import type { Question } from '../../types';
import { FSRS_RATINGS } from '../../types';

export interface QuizFeedbackProps {
  question: Question;
  userAnswer: string;
  isCorrect: boolean;
  hasRated: boolean;
  onRating: (rating: 1 | 2 | 3 | 4) => void;
}

export function QuizFeedback({
  question,
  userAnswer,
  isCorrect,
  hasRated,
  onRating,
}: QuizFeedbackProps) {
  return (
    <div className="quiz-feedback">
      <div className={`feedback-header ${isCorrect ? 'correct' : 'incorrect'}`}>
        <span className="feedback-icon">{isCorrect ? '✓' : '✗'}</span>
        <span className="feedback-text">
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </span>
      </div>

      {!isCorrect && question.options && (
        <div className="feedback-correct-answer">
          <p>
            <strong>Your answer:</strong> {userAnswer}) {question.options[userAnswer as keyof typeof question.options]}
          </p>
          <p>
            <strong>Correct answer:</strong> {question.correct_answer}) {question.options[question.correct_answer as keyof typeof question.options]}
          </p>
        </div>
      )}

      <div className="feedback-rationale">
        <p>{question.rationale}</p>
      </div>

      {!hasRated && (
        <div className="feedback-rating">
          <p className="rating-prompt">How difficult was this question?</p>
          <div className="rating-buttons">
            {([1, 2, 3, 4] as const).map((rating) => (
              <button
                key={rating}
                className={`rating-btn rating-${rating}`}
                onClick={() => onRating(rating)}
                title={FSRS_RATINGS[rating].description}
              >
                {FSRS_RATINGS[rating].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
