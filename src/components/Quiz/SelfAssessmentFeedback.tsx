import type { Question } from '../../types';
import { FSRS_RATINGS } from '../../types';

export interface SelfAssessmentFeedbackProps {
  question: Question;
  userAnswer: string;
  isCorrect?: boolean; // Provided for fill-in-blank, undefined for short answer
  hasRated: boolean;
  onRating: (rating: 1 | 2 | 3 | 4) => void;
}

export function SelfAssessmentFeedback({
  question,
  userAnswer,
  isCorrect,
  hasRated,
  onRating,
}: SelfAssessmentFeedbackProps) {
  const isShortAnswer = question.question_type === 'short_answer';
  const isFillInBlank = question.question_type === 'fill_in_blank';

  return (
    <div className="self-assessment-feedback">
      {/* Result indicator for fill-in-blank */}
      {isFillInBlank && isCorrect !== undefined && (
        <div className={`feedback-header ${isCorrect ? 'correct' : 'incorrect'}`}>
          <span className="feedback-icon">{isCorrect ? '✓' : '✗'}</span>
          <span className="feedback-text">
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </span>
        </div>
      )}

      {/* For short answer, show a neutral header */}
      {isShortAnswer && (
        <div className="feedback-header self-assess">
          <span className="feedback-text">Compare Your Answer</span>
        </div>
      )}

      {/* Your answer */}
      <div className="answer-comparison">
        <div className="answer-section user-answer-section">
          <h4>Your Answer:</h4>
          <p className="answer-text">{userAnswer}</p>
        </div>

        {/* Ideal answer / correct answers */}
        <div className="answer-section model-answer-section">
          <h4>{isShortAnswer ? 'Model Answer:' : 'Correct Answer(s):'}</h4>
          {isShortAnswer ? (
            <p className="answer-text">{question.ideal_answer}</p>
          ) : (
            <p className="answer-text">
              {question.correct_answers?.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Scoring rubric for short answer */}
      {isShortAnswer && question.scoring_rubric && (
        <div className="rubric-section">
          <h4>Scoring Guide:</h4>
          <ul className="rubric-list">
            <li>
              <strong>Full credit:</strong> {question.scoring_rubric.full_credit}
            </li>
            <li>
              <strong>Partial credit:</strong>{' '}
              {question.scoring_rubric.partial_credit}
            </li>
            <li>
              <strong>No credit:</strong> {question.scoring_rubric.no_credit}
            </li>
          </ul>
        </div>
      )}

      {/* Explanation */}
      <div className="feedback-rationale">
        <h4>Explanation:</h4>
        <p>{question.rationale}</p>
        {question.passage_evidence && (
          <blockquote className="passage-evidence">
            "{question.passage_evidence}"
          </blockquote>
        )}
      </div>

      {/* Self-assessment rating */}
      {!hasRated && (
        <div className="feedback-rating">
          <p className="rating-prompt">How well did you know this?</p>
          <div className="rating-buttons">
            {([1, 2, 3, 4] as const).map((rating) => (
              <button
                key={rating}
                className={`rating-btn rating-${rating}`}
                onClick={() => onRating(rating)}
                title={FSRS_RATINGS[rating].description}
              >
                <span className="rating-label">{FSRS_RATINGS[rating].label}</span>
                <span className="rating-description">
                  {FSRS_RATINGS[rating].description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
