import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock PocketBase service
vi.mock('../services/pocketbase', () => ({
  checkConnection: vi.fn().mockResolvedValue('connected'),
  createDocument: vi.fn().mockResolvedValue({ id: 'doc1' }),
  createSession: vi.fn().mockResolvedValue({ id: 'session1' }),
  updateSession: vi.fn().mockResolvedValue(undefined),
  getQuestionsForSession: vi.fn().mockResolvedValue([]),
  getMilestonesForSession: vi.fn().mockResolvedValue([]),
  markMilestonePrompted: vi.fn().mockResolvedValue(undefined),
  markMilestoneCompleted: vi.fn().mockResolvedValue(undefined),
  recordAttempt: vi.fn().mockResolvedValue({ id: 'attempt1' }),
  subscribeToQuestions: vi.fn().mockReturnValue(() => {}),
  subscribeToMilestones: vi.fn().mockReturnValue(() => {}),
  unsubscribeAll: vi.fn(),
}));

vi.mock('../services/aiCli', () => ({
  getAICliService: vi.fn().mockReturnValue({
    generateQuestions: vi.fn().mockResolvedValue({ status: 'success' }),
    isGenerating: vi.fn().mockReturnValue(false),
    cancel: vi.fn(),
  }),
}));

describe('Comprehension Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows backend status indicator', async () => {
    render(<App />);

    await waitFor(() => {
      const status = screen.getByTitle(/backend/i);
      expect(status).toBeInTheDocument();
    });
  });

  it('renders main app without errors', () => {
    render(<App />);
    expect(screen.getByText('FastReader')).toBeInTheDocument();
  });

  it('does not show quiz button when no session is active', async () => {
    render(<App />);

    // Wait for connection check to complete
    await waitFor(() => {
      expect(screen.getByTitle(/backend/i)).toBeInTheDocument();
    });

    // Quiz button should NOT be visible since no session has been created
    // (syncDocument would need to be called to create a session)
    const quizButton = screen.queryByRole('button', { name: /quiz/i });
    expect(quizButton).not.toBeInTheDocument();
  });

  it('backend status indicator shows correct state', async () => {
    render(<App />);

    // Wait for the status indicator to appear
    await waitFor(() => {
      const status = screen.getByTitle(/backend/i);
      expect(status).toBeInTheDocument();
      // Since we mocked isConnected to return true, it should show connected
      expect(status).toHaveTextContent('●');
    });
  });
});
