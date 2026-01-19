import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock collection methods
const mockCollection = {
  create: vi.fn(),
  getOne: vi.fn(),
  getList: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  subscribe: vi.fn().mockResolvedValue(undefined),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
};

// Mock health
const mockHealth = {
  check: vi.fn(),
};

// Mock PocketBase class
vi.mock('pocketbase', () => {
  return {
    default: class MockPocketBase {
      health = mockHealth;
      autoCancellation = vi.fn();
      collection = vi.fn(() => mockCollection);
    },
  };
});

// Clear singleton between tests
let pocketbaseModule: typeof import('./pocketbase');

describe('pocketbase service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module to clear singleton
    vi.resetModules();
    pocketbaseModule = await import('./pocketbase');
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('checkConnection', () => {
    it('returns connected when health check succeeds', async () => {
      mockHealth.check.mockResolvedValueOnce({ code: 200, message: 'OK' });
      const result = await pocketbaseModule.checkConnection();
      expect(result).toBe('connected');
    });

    it('returns disconnected when health check fails', async () => {
      mockHealth.check.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await pocketbaseModule.checkConnection();
      expect(result).toBe('disconnected');
    });
  });

  describe('document operations', () => {
    it('creates a document', async () => {
      const mockDoc = { id: 'doc1', title: 'Test', content: 'Hello', word_count: 1 };
      mockCollection.create.mockResolvedValueOnce(mockDoc);

      const result = await pocketbaseModule.createDocument({
        title: 'Test',
        content: 'Hello',
        source_type: 'paste',
        word_count: 1,
      });

      expect(result).toEqual(mockDoc);
      expect(mockCollection.create).toHaveBeenCalledWith({
        title: 'Test',
        content: 'Hello',
        source_type: 'paste',
        word_count: 1,
      });
    });

    it('gets a document by ID', async () => {
      const mockDoc = { id: 'doc1', title: 'Test' };
      mockCollection.getOne.mockResolvedValueOnce(mockDoc);

      const result = await pocketbaseModule.getDocument('doc1');

      expect(result).toEqual(mockDoc);
      expect(mockCollection.getOne).toHaveBeenCalledWith('doc1');
    });

    it('lists documents', async () => {
      const mockList = {
        items: [{ id: 'doc1' }, { id: 'doc2' }],
        totalItems: 2,
        totalPages: 1,
      };
      mockCollection.getList.mockResolvedValueOnce(mockList);

      const result = await pocketbaseModule.listDocuments(1, 50);

      expect(result.items).toHaveLength(2);
      expect(result.totalItems).toBe(2);
      expect(mockCollection.getList).toHaveBeenCalledWith(1, 50, { sort: '-created' });
    });

    it('deletes a document', async () => {
      mockCollection.delete.mockResolvedValueOnce(undefined);

      await pocketbaseModule.deleteDocument('doc1');

      expect(mockCollection.delete).toHaveBeenCalledWith('doc1');
    });
  });

  describe('session operations', () => {
    it('creates a session with default WPM', async () => {
      const mockSession = { id: 'session1', document: 'doc1', wpm_setting: 300 };
      mockCollection.create.mockResolvedValueOnce(mockSession);

      const result = await pocketbaseModule.createSession({
        document: 'doc1',
        total_words: 100,
      });

      expect(result).toEqual(mockSession);
      expect(mockCollection.create).toHaveBeenCalledWith({
        document: 'doc1',
        total_words: 100,
        current_word_index: 0,
        progress_percent: 0,
        wpm_setting: 300,
        is_active: true,
      });
    });

    it('creates a session with custom WPM', async () => {
      const mockSession = { id: 'session1', wpm_setting: 400 };
      mockCollection.create.mockResolvedValueOnce(mockSession);

      await pocketbaseModule.createSession({
        document: 'doc1',
        total_words: 100,
        wpm_setting: 400,
      });

      expect(mockCollection.create).toHaveBeenCalledWith(
        expect.objectContaining({ wpm_setting: 400 })
      );
    });

    it('gets current active session', async () => {
      const mockSession = { id: 'session1', is_active: true };
      mockCollection.getList.mockResolvedValueOnce({ items: [mockSession] });

      const result = await pocketbaseModule.getCurrentSession();

      expect(result).toEqual(mockSession);
      expect(mockCollection.getList).toHaveBeenCalledWith(1, 1, {
        filter: 'is_active = true',
        sort: '-updated',
        expand: 'document',
      });
    });

    it('returns null when no active session', async () => {
      mockCollection.getList.mockResolvedValueOnce({ items: [] });

      const result = await pocketbaseModule.getCurrentSession();

      expect(result).toBeNull();
    });

    it('updates a session', async () => {
      const mockSession = { id: 'session1', progress_percent: 50 };
      mockCollection.update.mockResolvedValueOnce(mockSession);

      const result = await pocketbaseModule.updateSession('session1', { progress_percent: 50 });

      expect(result).toEqual(mockSession);
      expect(mockCollection.update).toHaveBeenCalledWith('session1', { progress_percent: 50 });
    });

    it('deactivates a session', async () => {
      mockCollection.update.mockResolvedValueOnce({});

      await pocketbaseModule.deactivateSession('session1');

      expect(mockCollection.update).toHaveBeenCalledWith('session1', {
        is_active: false,
        completed_at: expect.any(String),
      });
    });
  });

  describe('question operations', () => {
    it('gets questions for a document', async () => {
      const mockQuestions = [{ id: 'q1' }, { id: 'q2' }];
      mockCollection.getList.mockResolvedValueOnce({ items: mockQuestions });

      const result = await pocketbaseModule.getQuestionsForDocument('doc1');

      expect(result).toEqual(mockQuestions);
      expect(mockCollection.getList).toHaveBeenCalledWith(1, 500, {
        filter: 'document = "doc1"',
        sort: '-created',
      });
    });

    it('gets questions for a session', async () => {
      const mockQuestions = [{ id: 'q1' }];
      mockCollection.getList.mockResolvedValueOnce({ items: mockQuestions });

      const result = await pocketbaseModule.getQuestionsForSession('session1');

      expect(result).toEqual(mockQuestions);
      expect(mockCollection.getList).toHaveBeenCalledWith(1, 100, {
        filter: 'session = "session1"',
        sort: '-created',
      });
    });
  });

  describe('question attempt operations', () => {
    it('records an attempt', async () => {
      const mockAttempt = { id: 'attempt1', rating: 3 };
      mockCollection.create.mockResolvedValueOnce(mockAttempt);

      const result = await pocketbaseModule.recordAttempt('q1', 'B', true, 3, 5000);

      expect(result).toEqual(mockAttempt);
      expect(mockCollection.create).toHaveBeenCalledWith({
        question: 'q1',
        user_answer: 'B',
        is_correct: true,
        rating: 3,
        time_spent_ms: 5000,
      });
    });

    it('gets due questions', async () => {
      const mockAttempts = [{ id: 'attempt1' }];
      mockCollection.getList.mockResolvedValueOnce({ items: mockAttempts });

      const result = await pocketbaseModule.getDueQuestions(20);

      expect(result).toEqual(mockAttempts);
      expect(mockCollection.getList).toHaveBeenCalledWith(1, 20, {
        filter: expect.stringContaining('due_at <='),
        sort: 'due_at',
        expand: 'question',
      });
    });
  });

  describe('milestone operations', () => {
    it('gets milestones for a session', async () => {
      const mockMilestones = [{ id: 'm1', milestone_percent: 25 }];
      mockCollection.getList.mockResolvedValueOnce({ items: mockMilestones });

      const result = await pocketbaseModule.getMilestonesForSession('session1');

      expect(result).toEqual(mockMilestones);
      expect(mockCollection.getList).toHaveBeenCalledWith(1, 100, {
        filter: 'session = "session1"',
        sort: 'milestone_percent',
      });
    });

    it('marks milestone as prompted', async () => {
      mockCollection.update.mockResolvedValueOnce({});

      await pocketbaseModule.markMilestonePrompted('m1');

      expect(mockCollection.update).toHaveBeenCalledWith('m1', { quiz_prompted: true });
    });

    it('marks milestone as completed', async () => {
      mockCollection.update.mockResolvedValueOnce({});

      await pocketbaseModule.markMilestoneCompleted('m1');

      expect(mockCollection.update).toHaveBeenCalledWith('m1', { quiz_completed: true });
    });
  });

  describe('subscriptions', () => {
    it('subscribes to questions and returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = pocketbaseModule.subscribeToQuestions('doc1', callback);

      expect(mockCollection.subscribe).toHaveBeenCalledWith('*', expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });

    it('subscribes to milestones and returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = pocketbaseModule.subscribeToMilestones('session1', callback);

      expect(mockCollection.subscribe).toHaveBeenCalledWith('*', expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });

    it('unsubscribes from all collections', () => {
      pocketbaseModule.unsubscribeAll();

      expect(mockCollection.unsubscribe).toHaveBeenCalled();
    });
  });
});
