import { useState, useEffect } from 'react';
import { getPocketBase } from '../services/pocketbase';

interface ReviewStats {
  totalQuestionsAnswered: number;
  correctCount: number;
  accuracyRate: number;
  questionsByState: {
    new: number;
    learning: number;
    review: number;
    relearning: number;
  };
  streakDays: number;
  isLoading: boolean;
  error: string | null;
}

export function useReviewStats(): ReviewStats {
  const [stats, setStats] = useState<ReviewStats>({
    totalQuestionsAnswered: 0,
    correctCount: 0,
    accuracyRate: 0,
    questionsByState: { new: 0, learning: 0, review: 0, relearning: 0 },
    streakDays: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const pb = getPocketBase();

        // Total attempts
        const totalAttempts = await pb.collection('question_attempts').getList(1, 1);

        // Correct attempts
        const correctAttempts = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'is_correct = true',
        });

        // Count by state (get latest attempt per question)
        const stateNew = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'state = 0',
        });
        const stateLearning = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'state = 1',
        });
        const stateReview = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'state = 2',
        });
        const stateRelearning = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'state = 3',
        });

        const total = totalAttempts.totalItems;
        const correct = correctAttempts.totalItems;

        setStats({
          totalQuestionsAnswered: total,
          correctCount: correct,
          accuracyRate: total > 0 ? correct / total : 0,
          questionsByState: {
            new: stateNew.totalItems,
            learning: stateLearning.totalItems,
            review: stateReview.totalItems,
            relearning: stateRelearning.totalItems,
          },
          streakDays: 0, // Could calculate from attempt dates
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load stats',
        }));
      }
    }

    fetchStats();
  }, []);

  return stats;
}
