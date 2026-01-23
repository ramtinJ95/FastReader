import { useState, useEffect } from 'react';
import { getPocketBase } from '../../services/pocketbase';
import QuestionCard from './QuestionCard';
import ReviewComplete from './ReviewComplete';
import type { QuestionAttempt, Question } from '../../types/comprehension';

interface Props {
  documentId: string | null;
  onComplete: () => void;
  onCancel: () => void;
}

interface ReviewQuestion {
  attemptId: string;
  questionId: string;
  questionText: string;
  questionType: string;
  options?: Record<string, string>;
  correctAnswer: string;
  rationale: string;
}

interface AttemptWithExpand extends QuestionAttempt {
  expand?: {
    question?: Question;
  };
}

export default function ReviewSession({ documentId, onComplete, onCancel }: Props) {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<{ correct: number; total: number }>({
    correct: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuestions() {
      setIsLoading(true);
      setError(null);

      try {
        const pb = getPocketBase();
        const now = new Date().toISOString();
        let filter = `due_at <= "${now}"`;

        if (documentId) {
          filter += ` && question.document = "${documentId}"`;
        }

        const attempts = await pb
          .collection('question_attempts')
          .getList<AttemptWithExpand>(1, 50, {
            filter,
            sort: 'due_at',
            expand: 'question',
          });

        const reviewQuestions: ReviewQuestion[] = attempts.items.map(
          (attempt: AttemptWithExpand) => {
            const q = attempt.expand?.question;
            return {
              attemptId: attempt.id,
              questionId: q?.id || '',
              questionText: q?.question_text || '',
              questionType: q?.question_type || 'multiple_choice',
              options: q?.options,
              correctAnswer: q?.correct_answer || '',
              rationale: q?.rationale || '',
            };
          }
        );

        setQuestions(reviewQuestions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions');
      } finally {
        setIsLoading(false);
      }
    }

    loadQuestions();
  }, [documentId]);

  const currentQuestion = questions[currentIndex];
  const isComplete = currentIndex >= questions.length;

  const handleAnswer = (answer: string) => {
    setUserAnswer(answer);
    setShowAnswer(true);
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4) => {
    if (!currentQuestion) return;

    const isCorrect = userAnswer === currentQuestion.correctAnswer;

    // Record the attempt
    const pb = getPocketBase();
    await pb.collection('question_attempts').create({
      question: currentQuestion.questionId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      rating,
    });

    setResults((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Move to next question
    setShowAnswer(false);
    setUserAnswer(null);
    setCurrentIndex((prev) => prev + 1);
  };

  if (isLoading) {
    return <div className="review-session review-session--loading">Loading review...</div>;
  }

  if (error) {
    return (
      <div className="review-session review-session--error">
        <p>Error: {error}</p>
        <button onClick={onCancel}>Back to Dashboard</button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="review-session review-session--empty">
        <p>No questions to review.</p>
        <button onClick={onCancel}>Back to Dashboard</button>
      </div>
    );
  }

  if (isComplete) {
    return <ReviewComplete correct={results.correct} total={results.total} onDone={onComplete} />;
  }

  return (
    <div className="review-session">
      <header className="review-session__header">
        <button className="review-session__cancel" onClick={onCancel}>
          Cancel
        </button>
        <span className="review-session__progress">
          {currentIndex + 1} / {questions.length}
        </span>
      </header>

      <QuestionCard
        question={currentQuestion}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        onRating={handleRating}
      />
    </div>
  );
}
