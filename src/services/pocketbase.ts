/**
 * PocketBase Service
 *
 * Handles all API interactions with PocketBase backend.
 * Provides type-safe methods for CRUD operations and real-time subscriptions.
 */

import PocketBase from 'pocketbase';
import type {
  ComprehensionDocument,
  ReadingSession,
  Question,
  QuestionAttempt,
  SessionMilestone,
  CreateDocumentInput,
  CreateSessionInput,
  UpdateSessionInput,
  SessionWithDocument,
  ConnectionStatus,
} from '../types/comprehension';

// Configuration
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

// Singleton PocketBase instance
let pbInstance: PocketBase | null = null;

/**
 * Get or create PocketBase client instance
 */
export function getPocketBase(): PocketBase {
  if (!pbInstance) {
    pbInstance = new PocketBase(POCKETBASE_URL);
    // Disable auto-cancellation for SSE subscriptions
    pbInstance.autoCancellation(false);
  }
  return pbInstance;
}

/**
 * Check if PocketBase is reachable
 */
export async function checkConnection(): Promise<ConnectionStatus> {
  try {
    const pb = getPocketBase();
    await pb.health.check();
    return 'connected';
  } catch (error) {
    console.error('PocketBase connection error:', error);
    return 'disconnected';
  }
}

// ============================================
// Document Operations
// ============================================

/**
 * Create a new document
 */
export async function createDocument(input: CreateDocumentInput): Promise<ComprehensionDocument> {
  const pb = getPocketBase();
  return await pb.collection('documents').create<ComprehensionDocument>(input);
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<ComprehensionDocument> {
  const pb = getPocketBase();
  return await pb.collection('documents').getOne<ComprehensionDocument>(id);
}

/**
 * List all documents
 */
export async function listDocuments(page = 1, perPage = 50): Promise<{
  items: ComprehensionDocument[];
  totalItems: number;
  totalPages: number;
}> {
  const pb = getPocketBase();
  const result = await pb.collection('documents').getList<ComprehensionDocument>(page, perPage, {
    sort: '-created',
  });
  return {
    items: result.items,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
  };
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  const pb = getPocketBase();
  await pb.collection('documents').delete(id);
}

// ============================================
// Session Operations
// ============================================

// Default WPM matches DEFAULT_SETTINGS.wordsPerMinute in types/index.ts
const DEFAULT_WPM = 300;

/**
 * Deactivate all currently active sessions
 */
async function deactivateAllActiveSessions(): Promise<void> {
  const pb = getPocketBase();
  try {
    // Get all active sessions
    const activeSessions = await pb.collection('sessions').getFullList<ReadingSession>({
      filter: 'is_active = true',
    });
    // Deactivate each one
    for (const session of activeSessions) {
      await pb.collection('sessions').update(session.id, {
        is_active: false,
      });
    }
  } catch (error) {
    console.error('Failed to deactivate old sessions:', error);
  }
}

/**
 * Create a new reading session
 * Automatically deactivates any existing active sessions first
 */
export async function createSession(input: CreateSessionInput): Promise<ReadingSession> {
  const pb = getPocketBase();
  // Deactivate old sessions so only one is active at a time
  await deactivateAllActiveSessions();
  return await pb.collection('sessions').create<ReadingSession>({
    ...input,
    current_word_index: 0,
    progress_percent: 0,
    wpm_setting: input.wpm_setting ?? DEFAULT_WPM,
    is_active: true,
  });
}

/**
 * Get the current active session with document
 */
export async function getCurrentSession(): Promise<SessionWithDocument | null> {
  const pb = getPocketBase();
  try {
    const result = await pb.collection('sessions').getList<SessionWithDocument>(1, 1, {
      filter: 'is_active = true',
      sort: '-updated',
      expand: 'document',
    });
    return result.items[0] || null;
  } catch {
    return null;
  }
}

/**
 * Update a session
 */
export async function updateSession(id: string, input: UpdateSessionInput): Promise<ReadingSession> {
  const pb = getPocketBase();
  return await pb.collection('sessions').update<ReadingSession>(id, input);
}

/**
 * Mark a session as inactive
 */
export async function deactivateSession(id: string): Promise<void> {
  const pb = getPocketBase();
  await pb.collection('sessions').update(id, {
    is_active: false,
    completed_at: new Date().toISOString(),
  });
}

// ============================================
// Question Operations
// ============================================

/**
 * Get questions for a document
 */
export async function getQuestionsForDocument(documentId: string): Promise<Question[]> {
  const pb = getPocketBase();
  const result = await pb.collection('questions').getList<Question>(1, 500, {
    filter: `document = "${documentId}"`,
    sort: '-created',
  });
  return result.items;
}

/**
 * Get questions for a session
 */
export async function getQuestionsForSession(sessionId: string): Promise<Question[]> {
  const pb = getPocketBase();
  const result = await pb.collection('questions').getList<Question>(1, 100, {
    filter: `session = "${sessionId}"`,
    sort: '-created',
  });
  return result.items;
}

// ============================================
// Question Attempt Operations
// ============================================

/**
 * Record an answer attempt
 */
export async function recordAttempt(
  questionId: string,
  userAnswer: string,
  isCorrect: boolean,
  rating: 1 | 2 | 3 | 4,
  timeSpentMs?: number
): Promise<QuestionAttempt> {
  const pb = getPocketBase();
  return await pb.collection('question_attempts').create<QuestionAttempt>({
    question: questionId,
    user_answer: userAnswer,
    is_correct: isCorrect,
    rating,
    time_spent_ms: timeSpentMs,
  });
}

/**
 * Get due questions for review
 */
export async function getDueQuestions(limit = 20): Promise<QuestionAttempt[]> {
  const pb = getPocketBase();
  const now = new Date().toISOString();
  const result = await pb.collection('question_attempts').getList<QuestionAttempt>(1, limit, {
    filter: `due_at <= "${now}"`,
    sort: 'due_at',
    expand: 'question',
  });
  return result.items;
}

// ============================================
// Milestone Operations
// ============================================

/**
 * Get milestones for a session
 */
export async function getMilestonesForSession(sessionId: string): Promise<SessionMilestone[]> {
  const pb = getPocketBase();
  const result = await pb.collection('session_milestones').getList<SessionMilestone>(1, 100, {
    filter: `session = "${sessionId}"`,
    sort: 'milestone_percent',
  });
  return result.items;
}

/**
 * Mark a milestone as quiz prompted
 */
export async function markMilestonePrompted(milestoneId: string): Promise<void> {
  const pb = getPocketBase();
  await pb.collection('session_milestones').update(milestoneId, {
    quiz_prompted: true,
  });
}

/**
 * Mark a milestone as quiz completed
 */
export async function markMilestoneCompleted(milestoneId: string): Promise<void> {
  const pb = getPocketBase();
  await pb.collection('session_milestones').update(milestoneId, {
    quiz_completed: true,
  });
}

// ============================================
// Real-time Subscriptions
// ============================================

type SubscriptionCallback<T> = (data: { action: string; record: T }) => void;
type SubscriptionErrorCallback = (error: Error) => void;
type UnsubscribeFunction = () => void;

/**
 * Subscribe to question changes for a document
 */
export function subscribeToQuestions(
  documentId: string,
  callback: SubscriptionCallback<Question>,
  onError?: SubscriptionErrorCallback
): UnsubscribeFunction {
  const pb = getPocketBase();

  pb.collection('questions').subscribe<Question>('*', (e) => {
    try {
      if (e.record.document === documentId) {
        callback({ action: e.action, record: e.record });
      }
    } catch (error) {
      console.error('Error in questions subscription callback:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }).catch((error) => {
    console.error('Failed to subscribe to questions:', error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
  });

  return () => {
    pb.collection('questions').unsubscribe('*').catch((error) => {
      console.error('Failed to unsubscribe from questions:', error);
    });
  };
}

/**
 * Subscribe to milestone changes for a session
 */
export function subscribeToMilestones(
  sessionId: string,
  callback: SubscriptionCallback<SessionMilestone>,
  onError?: SubscriptionErrorCallback
): UnsubscribeFunction {
  const pb = getPocketBase();

  pb.collection('session_milestones').subscribe<SessionMilestone>('*', (e) => {
    try {
      if (e.record.session === sessionId) {
        callback({ action: e.action, record: e.record });
      }
    } catch (error) {
      console.error('Error in milestones subscription callback:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }).catch((error) => {
    console.error('Failed to subscribe to milestones:', error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
  });

  return () => {
    pb.collection('session_milestones').unsubscribe('*').catch((error) => {
      console.error('Failed to unsubscribe from milestones:', error);
    });
  };
}

/**
 * Unsubscribe from all collections
 */
export function unsubscribeAll(): void {
  const pb = getPocketBase();
  pb.collection('questions').unsubscribe().catch((error) => {
    console.error('Failed to unsubscribe from questions:', error);
  });
  pb.collection('session_milestones').unsubscribe().catch((error) => {
    console.error('Failed to unsubscribe from milestones:', error);
  });
}
