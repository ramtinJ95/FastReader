import { useCallback } from 'react';
import type { QuizState } from '../../types';
import { MCQQuestion } from './MCQQuestion';
import { ShortAnswerQuestion } from './ShortAnswerQuestion';
import { FillInBlankQuestion } from './FillInBlankQuestion';
import { QuizFeedback } from './QuizFeedback';
import { SelfAssessmentFeedback } from './SelfAssessmentFeedback';
import './Quiz.css';

export interface QuizModalProps {
  quiz: QuizState;
  onAnswer: (questionId: string, answer: string, isCorrect?: boolean) => void;
  onRating: (questionId: string, rating: 1 | 2 | 3 | 4) => void;
  onNext: () => void;
  onClose: () => void;
}

export function QuizModal({ quiz, onAnswer, onRating, onNext, onClose }: QuizModalProps) {
  const currentQuestion = quiz.questions[quiz.currentIndex];
  const currentAnswer = currentQuestion ? quiz.answers.get(currentQuestion.id) : undefined;
  const isLastQuestion = quiz.currentIndex === quiz.questions.length - 1;
  const progress = ((quiz.currentIndex + 1) / quiz.questions.length) * 100;

  const handleClose = useCallback(() => {
    if (quiz.isGenerating) return; // Don't allow close while generating
    onClose();
  }, [quiz.isGenerating, onClose]);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div
        className="dialog quiz-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="quiz-header">
          <h3 id="quiz-title">Quiz</h3>
          <button
            className="quiz-close-btn"
            onClick={handleClose}
            aria-label="Close quiz"
            disabled={quiz.isGenerating}
          >
            &times;
          </button>
        </div>

        <div className="quiz-progress">
          <span className="quiz-progress-text">
            Question {quiz.currentIndex + 1} of {quiz.questions.length}
          </span>
          <div className="quiz-progress-bar">
            <div
              className="quiz-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="quiz-question-type">
            {formatComprehensionType(currentQuestion.comprehension_type)}
          </span>
        </div>

        <div className="quiz-content">
          {!currentAnswer ? (
            // Show question
            currentQuestion.question_type === 'multiple_choice' ? (
              <MCQQuestion
                question={currentQuestion}
                onAnswer={(answer) => onAnswer(currentQuestion.id, answer)}
              />
            ) : currentQuestion.question_type === 'short_answer' ? (
              <ShortAnswerQuestion
                question={currentQuestion}
                onAnswer={(answer) => onAnswer(currentQuestion.id, answer)}
              />
            ) : currentQuestion.question_type === 'fill_in_blank' ? (
              <FillInBlankQuestion
                question={currentQuestion}
                onAnswer={(answer, isCorrect) => onAnswer(currentQuestion.id, answer, isCorrect)}
              />
            ) : (
              // Unknown question type
              <div className="quiz-question">
                <p>{currentQuestion.question_text}</p>
                <p className="quiz-unsupported">
                  This question type ({currentQuestion.question_type}) is not supported.
                </p>
              </div>
            )
          ) : (
            // Show feedback - use appropriate component based on question type
            currentQuestion.question_type === 'multiple_choice' ? (
              <QuizFeedback
                question={currentQuestion}
                userAnswer={currentAnswer.answer}
                isCorrect={currentAnswer.isCorrect}
                hasRated={currentAnswer.rating !== undefined}
                onRating={(rating) => onRating(currentQuestion.id, rating)}
              />
            ) : (
              <SelfAssessmentFeedback
                question={currentQuestion}
                userAnswer={currentAnswer.answer}
                isCorrect={currentQuestion.question_type === 'fill_in_blank' ? currentAnswer.isCorrect : undefined}
                hasRated={currentAnswer.rating !== undefined}
                onRating={(rating) => onRating(currentQuestion.id, rating)}
              />
            )
          )}
        </div>

        {currentAnswer?.rating !== undefined && (
          <div className="quiz-actions">
            <button
              className="btn primary"
              onClick={isLastQuestion ? handleClose : onNext}
            >
              {isLastQuestion ? 'Finish' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatComprehensionType(type: string): string {
  switch (type) {
    case 'factual_recall':
      return 'Factual';
    case 'inference':
      return 'Inference';
    case 'synthesis':
      return 'Synthesis';
    default:
      return type;
  }
}
