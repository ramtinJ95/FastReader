import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComprehension } from './useComprehension';

// Mock services
vi.mock('../services/pocketbase', () => ({
  checkConnection: vi.fn().mockResolvedValue('connected'),
  createDocument: vi.fn().mockResolvedValue({ id: 'doc1' }),
  createSession: vi.fn().mockResolvedValue({ id: 'session1' }),
  updateSession: vi.fn().mockResolvedValue(undefined),
  recordAttempt: vi.fn().mockResolvedValue({ id: 'attempt1' }),
  markMilestonePrompted: vi.fn().mockResolvedValue(undefined),
  markMilestoneCompleted: vi.fn().mockResolvedValue(undefined),
  subscribeToQuestions: vi.fn().mockReturnValue(() => {}),
  subscribeToMilestones: vi.fn().mockReturnValue(() => {}),
  unsubscribeAll: vi.fn(),
}));

vi.mock('../services/aiCli', () => ({
  generateQuestionsViaServer: vi.fn().mockResolvedValue({ success: true }),
}));

describe('useComprehension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connection', () => {
    it('checks connection on mount and updates status', async () => {
      const { result } = renderHook(() => useComprehension());

      // Initially connecting
      expect(result.current.connectionStatus).toBe('connecting');

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('calls onConnectionChange callback when connected', async () => {
      const onConnectionChange = vi.fn();
      renderHook(() => useComprehension({ onConnectionChange }));

      await waitFor(() => {
        expect(onConnectionChange).toHaveBeenCalledWith('connected');
      });
    });
  });

  describe('initial state', () => {
    it('starts with no active session', async () => {
      const { result } = renderHook(() => useComprehension());

      expect(result.current.sessionId).toBeNull();
      expect(result.current.documentId).toBeNull();

      // Wait for connection to complete to avoid act warnings
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('starts with no quiz', async () => {
      const { result } = renderHook(() => useComprehension());

      expect(result.current.quiz).toBeNull();
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.generationError).toBeNull();

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('starts with no pending milestone', async () => {
      const { result } = renderHook(() => useComprehension());

      expect(result.current.pendingMilestone).toBeNull();

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });

  describe('syncDocument', () => {
    it('creates document and session when connected', async () => {
      const { result } = renderHook(() => useComprehension());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.syncDocument('Test Document', 'Content here', 2);
      });

      expect(result.current.documentId).toBe('doc1');
      expect(result.current.sessionId).toBe('session1');
    });

    it('does not sync when disconnected', async () => {
      const pocketbase = await import('../services/pocketbase');
      vi.mocked(pocketbase.checkConnection).mockResolvedValueOnce('disconnected');

      const { result } = renderHook(() => useComprehension());

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });

      await act(async () => {
        await result.current.syncDocument('Test', 'Content', 1);
      });

      expect(pocketbase.createDocument).not.toHaveBeenCalled();
      expect(result.current.documentId).toBeNull();
    });
  });

  describe('quiz state', () => {
    it('can answer a question (no-op when no quiz)', async () => {
      const { result } = renderHook(() => useComprehension());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.answerQuestion('q1', 'A');
      });

      // Since there's no quiz, this should do nothing
      expect(result.current.quiz).toBeNull();
    });

    it('can close quiz', async () => {
      const { result } = renderHook(() => useComprehension());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.closeQuiz();
      });

      expect(result.current.quiz).toBeNull();
      expect(result.current.generationError).toBeNull();
    });

    it('can navigate to next question (no-op when no quiz)', async () => {
      const { result } = renderHook(() => useComprehension());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.nextQuestion();
      });

      // With no quiz, nothing should change
      expect(result.current.quiz).toBeNull();
    });
  });

  describe('generateQuiz', () => {
    it('sets error when no session exists', async () => {
      const { result } = renderHook(() => useComprehension());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.generateQuiz();
      });

      expect(result.current.generationError).toBe('No active session');
    });

    it('starts generation when session exists', async () => {
      const { result } = renderHook(() => useComprehension());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // First sync a document
      await act(async () => {
        await result.current.syncDocument('Test', 'Content', 1);
      });

      expect(result.current.sessionId).toBe('session1');

      await act(async () => {
        await result.current.generateQuiz(3);
      });

      const { generateQuestionsViaServer } = await import('../services/aiCli');
      expect(generateQuestionsViaServer).toHaveBeenCalledWith('session1', 'doc1', 3);
    });
  });

  describe('reconnect', () => {
    it('can manually reconnect', async () => {
      const pocketbase = await import('../services/pocketbase');

      const { result } = renderHook(() => useComprehension());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.reconnect();
      });

      // checkConnection should be called again
      expect(pocketbase.checkConnection).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup', () => {
    it('unsubscribes on unmount', async () => {
      const pocketbase = await import('../services/pocketbase');

      const { unmount, result } = renderHook(() => useComprehension());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      unmount();

      expect(pocketbase.unsubscribeAll).toHaveBeenCalled();
    });
  });
});
