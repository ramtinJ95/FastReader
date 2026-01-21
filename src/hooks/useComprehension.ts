/**
 * useComprehension Hook
 *
 * Manages comprehension feature state including:
 * - PocketBase connection status
 * - Document and session sync
 * - Quiz generation and state
 * - Milestone detection
 * - Answer recording with FSRS ratings
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  checkConnection,
  createDocument,
  createSession,
  updateSession,
  recordAttempt,
  markMilestonePrompted,
  markMilestoneCompleted,
  subscribeToQuestions,
  subscribeToMilestones,
  unsubscribeAll,
} from '../services/pocketbase';
import { getAICliService } from '../services/aiCli';
import type {
  QuizState,
  SessionMilestone,
  ConnectionStatus,
} from '../types/comprehension';

export interface UseComprehensionOptions {
  /** Called when a milestone is reached */
  onMilestone?: (milestone: SessionMilestone) => void;
  /** Called when connection status changes */
  onConnectionChange?: (status: ConnectionStatus) => void;
}

export interface UseComprehensionReturn {
  // Connection state
  connectionStatus: ConnectionStatus;
  isConnected: boolean;

  // Session state
  sessionId: string | null;
  documentId: string | null;

  // Milestone state
  pendingMilestone: SessionMilestone | null;
  dismissMilestone: () => void;

  // Quiz state
  quiz: QuizState | null;
  isGenerating: boolean;
  generationError: string | null;

  // Actions
  generateQuiz: (count?: number) => Promise<void>;
  answerQuestion: (questionId: string, answer: string, isCorrect?: boolean) => void;
  rateQuestion: (questionId: string, rating: 1 | 2 | 3 | 4) => Promise<void>;
  nextQuestion: () => void;
  closeQuiz: () => void;

  // Document sync
  syncDocument: (title: string, content: string, wordCount: number) => Promise<void>;
  updateProgress: (wordIndex: number, totalWords: number) => Promise<void>;

  // Manual reconnect
  reconnect: () => Promise<void>;
}

export function useComprehension(options: UseComprehensionOptions = {}): UseComprehensionReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [pendingMilestone, setPendingMilestone] = useState<SessionMilestone | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const unsubscribersRef = useRef<(() => void)[]>([]);
  const optionsRef = useRef(options);
  const generationTimeoutRef = useRef<number | null>(null);

  // Update optionsRef in an effect to avoid accessing refs during render
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const isConnected = connectionStatus === 'connected';

  // Check connection on mount
  useEffect(() => {
    let mounted = true;

    const doCheck = async () => {
      const status = await checkConnection();
      if (mounted) {
        setConnectionStatus(status);
        optionsRef.current.onConnectionChange?.(status);
      }
    };

    doCheck();

    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to SSE events when session is active
  useEffect(() => {
    if (!sessionId || !documentId || !isConnected) return;

    // Subscribe to new questions for this document
    const unsubQuestions = subscribeToQuestions(
      documentId,
      ({ action, record }) => {
        if (action === 'create') {
          // Clear the generation timeout since we received a question
          if (generationTimeoutRef.current) {
            clearTimeout(generationTimeoutRef.current);
            generationTimeoutRef.current = null;
          }
          setQuiz((prev) => {
            if (!prev) {
              return {
                questions: [record],
                currentIndex: 0,
                answers: new Map(),
                isGenerating: false,
              };
            }
            // Check if question already exists
            if (prev.questions.some((q) => q.id === record.id)) {
              return prev;
            }
            return {
              ...prev,
              questions: [...prev.questions, record],
              isGenerating: false,
            };
          });
          setIsGenerating(false);
        }
      },
      (error) => {
        console.error('Questions subscription error:', error);
      }
    );

    // Subscribe to milestones for this session
    const unsubMilestones = subscribeToMilestones(
      sessionId,
      ({ action, record }) => {
        if (action === 'create' && !record.quiz_prompted) {
          setPendingMilestone(record);
          optionsRef.current.onMilestone?.(record);
        }
      },
      (error) => {
        console.error('Milestones subscription error:', error);
      }
    );

    unsubscribersRef.current = [unsubQuestions, unsubMilestones];

    return () => {
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
    };
  }, [sessionId, documentId, isConnected]);

  // Reset generation state when session/document changes (e.g., user loads new text)
  // This prevents the "generating" overlay from being stuck when switching documents
  useEffect(() => {
    // Clear any pending generation timeout from previous session
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }
    // Reset generation state - new session means any old generation is orphaned
    setIsGenerating(false);
    setGenerationError(null);
    // Clear quiz from previous document
    setQuiz(null);
  }, [sessionId, documentId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }
      unsubscribeAll();
    };
  }, []);

  const reconnect = useCallback(async () => {
    setConnectionStatus('connecting');
    const status = await checkConnection();
    setConnectionStatus(status);
    optionsRef.current.onConnectionChange?.(status);
  }, []);

  const syncDocument = useCallback(
    async (title: string, content: string, wordCount: number) => {
      if (!isConnected) {
        console.warn('Cannot sync document: not connected to PocketBase');
        return;
      }

      try {
        // Create document
        const doc = await createDocument({
          title: title || 'Untitled',
          content,
          source_type: 'paste',
          word_count: wordCount,
        });
        setDocumentId(doc.id);

        // Create session
        const session = await createSession({
          document: doc.id,
          total_words: wordCount,
        });
        setSessionId(session.id);
      } catch (error) {
        console.error('Failed to sync document:', error);
      }
    },
    [isConnected]
  );

  const updateProgress = useCallback(
    async (wordIndex: number, totalWords: number) => {
      if (!sessionId) return;

      try {
        const progress = totalWords > 0 ? (wordIndex / totalWords) * 100 : 0;
        await updateSession(sessionId, {
          current_word_index: wordIndex,
          progress_percent: progress,
        });
      } catch (error) {
        console.error('Failed to update progress:', error);
      }
    },
    [sessionId]
  );

  const dismissMilestone = useCallback(async () => {
    if (!pendingMilestone) return;

    try {
      await markMilestonePrompted(pendingMilestone.id);
      setPendingMilestone(null);
    } catch (error) {
      console.error('Failed to dismiss milestone:', error);
      setPendingMilestone(null);
    }
  }, [pendingMilestone]);

  const generateQuiz = useCallback(
    async (count: number = 5) => {
      if (!sessionId || !documentId) {
        setGenerationError('No active session');
        return;
      }

      setIsGenerating(true);
      setGenerationError(null);

      try {
        const cliService = getAICliService();
        await cliService.generateQuestions(sessionId, documentId, count);

        // Mark milestone as prompted if we have one
        if (pendingMilestone) {
          await markMilestonePrompted(pendingMilestone.id);
          setPendingMilestone(null);
        }

        // Questions will arrive via SSE subscription
        // Set a timeout in case generation fails silently
        // Clear any existing timeout first
        if (generationTimeoutRef.current) {
          clearTimeout(generationTimeoutRef.current);
        }
        generationTimeoutRef.current = window.setTimeout(() => {
          generationTimeoutRef.current = null;
          setIsGenerating((current) => {
            if (current) {
              setGenerationError(
                'Generation timed out. Please try again or run the CLI manually.'
              );
              return false;
            }
            return current;
          });
        }, 120000); // 2 minute timeout
      } catch (error) {
        setIsGenerating(false);
        setGenerationError(
          error instanceof Error ? error.message : 'Failed to generate questions'
        );
      }
    },
    [sessionId, documentId, pendingMilestone]
  );

  const answerQuestion = useCallback(
    (questionId: string, answer: string, providedIsCorrect?: boolean) => {
      setQuiz((prev) => {
        if (!prev) return null;

        const question = prev.questions.find((q) => q.id === questionId);
        if (!question) return prev;

        // Use provided isCorrect if available (e.g., from fill_in_blank component),
        // otherwise compute based on question type
        let isCorrect: boolean;
        if (providedIsCorrect !== undefined) {
          isCorrect = providedIsCorrect;
        } else if (question.question_type === 'fill_in_blank' && question.correct_answers) {
          // For fill_in_blank, check against correct_answers array (case-insensitive)
          const normalizedAnswer = answer.trim().toLowerCase();
          isCorrect = question.correct_answers.some(
            (correct) => correct.toLowerCase() === normalizedAnswer
          );
        } else if (question.question_type === 'short_answer') {
          // For short_answer, we can't auto-check - mark as correct by default
          // User will self-assess via rating
          isCorrect = true;
        } else {
          // For MCQ, compare with correct_answer
          isCorrect = answer === question.correct_answer;
        }

        const newAnswers = new Map(prev.answers);
        newAnswers.set(questionId, { answer, isCorrect });

        return { ...prev, answers: newAnswers };
      });
    },
    []
  );

  const rateQuestion = useCallback(
    async (questionId: string, rating: 1 | 2 | 3 | 4) => {
      const currentQuiz = quiz;
      if (!currentQuiz) return;

      const answerData = currentQuiz.answers.get(questionId);
      if (!answerData) return;

      // Update local state
      setQuiz((prev) => {
        if (!prev) return null;

        const newAnswers = new Map(prev.answers);
        newAnswers.set(questionId, { ...answerData, rating });

        return { ...prev, answers: newAnswers };
      });

      // Record attempt in PocketBase
      try {
        await recordAttempt(questionId, answerData.answer, answerData.isCorrect, rating);
      } catch (error) {
        console.error('Failed to record attempt:', error);
      }
    },
    [quiz]
  );

  const nextQuestion = useCallback(() => {
    setQuiz((prev) => {
      if (!prev) return null;
      if (prev.currentIndex >= prev.questions.length - 1) return prev;
      return { ...prev, currentIndex: prev.currentIndex + 1 };
    });
  }, []);

  const closeQuiz = useCallback(async () => {
    // Mark milestone as completed if we have one
    if (pendingMilestone) {
      try {
        await markMilestoneCompleted(pendingMilestone.id);
      } catch (error) {
        console.error('Failed to mark milestone completed:', error);
      }
    }

    setQuiz(null);
    setGenerationError(null);
  }, [pendingMilestone]);

  return {
    connectionStatus,
    isConnected,
    sessionId,
    documentId,
    pendingMilestone,
    dismissMilestone,
    quiz,
    isGenerating,
    generationError,
    generateQuiz,
    answerQuestion,
    rateQuestion,
    nextQuestion,
    closeQuiz,
    syncDocument,
    updateProgress,
    reconnect,
  };
}
