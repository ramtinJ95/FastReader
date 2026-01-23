import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPocketBase } from '../services/pocketbase';
import type { QuestionAttempt, Question, ComprehensionDocument } from '../types/comprehension';

interface DueQuestion {
  id: string;
  questionId: string;
  questionText: string;
  questionType: string;
  documentId: string;
  documentTitle: string;
  dueAt: string;
  stability: number;
  difficulty: number;
  state: number;
  reps: number;
  lapses: number;
}

interface DueQuestionsResult {
  questions: DueQuestion[];
  totalDue: number;
  byDocument: Map<string, { title: string; count: number; questions: DueQuestion[] }>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface AttemptWithExpand extends QuestionAttempt {
  expand?: {
    question?: Question & {
      expand?: {
        document?: ComprehensionDocument;
      };
    };
  };
}

export function useDueQuestions(): DueQuestionsResult {
  const [questions, setQuestions] = useState<DueQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDueQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pb = getPocketBase();
      const now = new Date().toISOString();

      // Get all question_attempts with due_at <= now
      const attempts = await pb.collection('question_attempts').getList<AttemptWithExpand>(1, 100, {
        filter: `due_at <= "${now}"`,
        sort: 'due_at',
        expand: 'question,question.document',
      });

      const dueQuestions: DueQuestion[] = attempts.items.map((attempt) => {
        const question = attempt.expand?.question;
        const document = question?.expand?.document;

        return {
          id: attempt.id,
          questionId: question?.id || '',
          questionText: question?.question_text || '',
          questionType: question?.question_type || '',
          documentId: document?.id || '',
          documentTitle: document?.title || 'Unknown Document',
          dueAt: attempt.due_at || '',
          stability: attempt.stability || 0,
          difficulty: attempt.difficulty || 5,
          state: attempt.state || 0,
          reps: attempt.reps || 0,
          lapses: attempt.lapses || 0,
        };
      });

      setQuestions(dueQuestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch due questions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDueQuestions();
  }, [fetchDueQuestions]);

  // Group questions by document
  const byDocument = useMemo(() => {
    const map = new Map<string, { title: string; count: number; questions: DueQuestion[] }>();

    for (const q of questions) {
      const existing = map.get(q.documentId);
      if (existing) {
        existing.count++;
        existing.questions.push(q);
      } else {
        map.set(q.documentId, {
          title: q.documentTitle,
          count: 1,
          questions: [q],
        });
      }
    }

    return map;
  }, [questions]);

  return {
    questions,
    totalDue: questions.length,
    byDocument,
    isLoading,
    error,
    refresh: fetchDueQuestions,
  };
}
