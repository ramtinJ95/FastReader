/**
 * Comprehension Context
 *
 * Provides global state management for the comprehension feature.
 * Handles PocketBase connection, real-time subscriptions, and quiz state.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import {
  checkConnection,
  getCurrentSession,
  createDocument,
  createSession,
  updateSession,
  getMilestonesForSession,
  getQuestionsForSession,
  subscribeToQuestions,
  subscribeToMilestones,
  unsubscribeAll,
} from '../services/pocketbase';

import type {
  ConnectionStatus,
  ComprehensionDocument,
  ReadingSession,
  Question,
  SessionMilestone,
  CreateDocumentInput,
} from '../types/comprehension';

// ============================================
// Context Types
// ============================================

interface ComprehensionState {
  // Connection
  connectionStatus: ConnectionStatus;

  // Current session
  currentSession: ReadingSession | null;
  currentDocument: ComprehensionDocument | null;

  // Questions and milestones
  questions: Question[];
  milestones: SessionMilestone[];
  pendingMilestone: number | null;

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
}

interface ComprehensionActions {
  // Session management
  startNewSession: (input: CreateDocumentInput) => Promise<void>;
  updateProgress: (wordIndex: number, progressPercent: number) => Promise<void>;
  endSession: () => Promise<void>;

  // Milestone management
  dismissMilestone: () => void;

  // Manual refresh
  refreshConnection: () => Promise<void>;
}

type ComprehensionContextType = ComprehensionState & ComprehensionActions;

// ============================================
// Context Creation
// ============================================

const ComprehensionContext = createContext<ComprehensionContextType | null>(null);

// ============================================
// Provider Component
// ============================================

interface ComprehensionProviderProps {
  children: ReactNode;
}

export function ComprehensionProvider({ children }: ComprehensionProviderProps) {
  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [currentSession, setCurrentSession] = useState<ReadingSession | null>(null);
  const [currentDocument, setCurrentDocument] = useState<ComprehensionDocument | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [milestones, setMilestones] = useState<SessionMilestone[]>([]);
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs for cleanup
  const unsubscribeQuestionsRef = useRef<(() => void) | null>(null);
  const unsubscribeMilestonesRef = useRef<(() => void) | null>(null);

  // ----------------------------------------
  // SSE Subscriptions
  // ----------------------------------------

  const setupSubscriptions = useCallback((documentId: string, sessionId: string) => {
    // Clean up existing subscriptions
    unsubscribeQuestionsRef.current?.();
    unsubscribeMilestonesRef.current?.();

    // Subscribe to questions
    unsubscribeQuestionsRef.current = subscribeToQuestions(documentId, (e) => {
      if (e.action === 'create') {
        console.log('SSE: New question received', e.record.id);
        setQuestions(prev => [e.record, ...prev]);
      } else if (e.action === 'update') {
        setQuestions(prev => prev.map(q => q.id === e.record.id ? e.record : q));
      } else if (e.action === 'delete') {
        setQuestions(prev => prev.filter(q => q.id !== e.record.id));
      }
    });

    // Subscribe to milestones
    unsubscribeMilestonesRef.current = subscribeToMilestones(sessionId, (e) => {
      if (e.action === 'create') {
        console.log('SSE: New milestone reached', e.record.milestone_percent);
        setMilestones(prev => [...prev, e.record]);

        // Set as pending if not yet prompted
        if (!e.record.quiz_prompted && !e.record.quiz_completed) {
          setPendingMilestone(e.record.milestone_percent);
        }
      } else if (e.action === 'update') {
        setMilestones(prev => prev.map(m => m.id === e.record.id ? e.record : m));
      }
    });
  }, []);

  // ----------------------------------------
  // Connection and Initialization
  // ----------------------------------------

  const initializeConnection = useCallback(async () => {
    setConnectionStatus('connecting');
    setIsLoading(true);

    try {
      const status = await checkConnection();
      setConnectionStatus(status);

      if (status === 'connected') {
        // Load current session if one exists
        const session = await getCurrentSession();

        if (session) {
          setCurrentSession(session);
          setCurrentDocument(session.expand?.document || null);

          // Load questions and milestones
          const [sessionQuestions, sessionMilestones] = await Promise.all([
            getQuestionsForSession(session.id),
            getMilestonesForSession(session.id),
          ]);

          setQuestions(sessionQuestions);
          setMilestones(sessionMilestones);

          // Check for pending milestone
          const pending = sessionMilestones.find(m => !m.quiz_prompted && !m.quiz_completed);
          setPendingMilestone(pending?.milestone_percent || null);

          // Set up subscriptions
          setupSubscriptions(session.document, session.id);
        }
      }
    } catch (error) {
      console.error('Failed to initialize comprehension context:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [setupSubscriptions]);

  // ----------------------------------------
  // Session Management
  // ----------------------------------------

  const startNewSession = useCallback(async (input: CreateDocumentInput) => {
    setIsLoading(true);

    try {
      // Create document
      const document = await createDocument(input);

      // Create session
      const session = await createSession({
        document: document.id,
        total_words: input.word_count,
      });

      setCurrentDocument(document);
      setCurrentSession(session);
      setQuestions([]);
      setMilestones([]);
      setPendingMilestone(null);

      // Set up subscriptions for new session
      setupSubscriptions(document.id, session.id);

    } catch (error) {
      console.error('Failed to start new session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setupSubscriptions]);

  const updateProgress = useCallback(async (wordIndex: number, progressPercent: number) => {
    if (!currentSession) return;

    try {
      const updated = await updateSession(currentSession.id, {
        current_word_index: wordIndex,
        progress_percent: progressPercent,
      });

      setCurrentSession(updated);
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }, [currentSession]);

  const endSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      await updateSession(currentSession.id, {
        is_active: false,
        completed_at: new Date().toISOString(),
      });

      // Clean up
      unsubscribeQuestionsRef.current?.();
      unsubscribeMilestonesRef.current?.();

      setCurrentSession(null);
      setCurrentDocument(null);
      setQuestions([]);
      setMilestones([]);
      setPendingMilestone(null);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }, [currentSession]);

  // ----------------------------------------
  // Milestone Management
  // ----------------------------------------

  const dismissMilestone = useCallback(() => {
    setPendingMilestone(null);
  }, []);

  // ----------------------------------------
  // Lifecycle
  // ----------------------------------------

  // Initialize on mount
  useEffect(() => {
    initializeConnection();

    return () => {
      unsubscribeQuestionsRef.current?.();
      unsubscribeMilestonesRef.current?.();
      unsubscribeAll();
    };
  }, [initializeConnection]);

  // Reconnection polling when disconnected
  useEffect(() => {
    if (connectionStatus !== 'disconnected') return;

    const interval = setInterval(async () => {
      const status = await checkConnection();
      if (status === 'connected') {
        initializeConnection();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connectionStatus, initializeConnection]);

  // ----------------------------------------
  // Context Value
  // ----------------------------------------

  const value: ComprehensionContextType = {
    // State
    connectionStatus,
    currentSession,
    currentDocument,
    questions,
    milestones,
    pendingMilestone,
    isLoading,
    isInitialized,

    // Actions
    startNewSession,
    updateProgress,
    endSession,
    dismissMilestone,
    refreshConnection: initializeConnection,
  };

  return (
    <ComprehensionContext.Provider value={value}>
      {children}
    </ComprehensionContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useComprehension(): ComprehensionContextType {
  const context = useContext(ComprehensionContext);

  if (!context) {
    throw new Error('useComprehension must be used within a ComprehensionProvider');
  }

  return context;
}
