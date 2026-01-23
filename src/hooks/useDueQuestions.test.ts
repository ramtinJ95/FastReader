import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDueQuestions } from './useDueQuestions';
import type { QuestionAttempt, Question, ComprehensionDocument } from '../types/comprehension';

// Create a shared mock for getList
const mockGetList = vi.fn();

// Mock PocketBase
vi.mock('../services/pocketbase', () => ({
  getPocketBase: vi.fn(() => ({
    collection: vi.fn(() => ({
      getList: mockGetList,
    })),
  })),
}));

describe('useDueQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetList.mockReset();
  });

  it('should fetch and return due questions', async () => {
    const mockDocument: ComprehensionDocument = {
      id: 'doc1',
      title: 'Test Document',
      content: 'Test content',
      source_type: 'paste',
      word_count: 100,
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
    };

    const mockQuestion: Question = {
      id: 'q1',
      document: 'doc1',
      question_text: 'What is the answer?',
      question_type: 'multiple_choice',
      comprehension_type: 'factual_recall',
      correct_answer: 'A',
      rationale: 'Test rationale',
      created: '2024-01-01T00:00:00Z',
    };

    const mockAttempt: QuestionAttempt = {
      id: 'attempt1',
      question: 'q1',
      stability: 5,
      difficulty: 5,
      due_at: '2024-01-01T00:00:00Z',
      state: 2,
      reps: 1,
      lapses: 0,
      created: '2024-01-01T00:00:00Z',
    };

    const mockAttemptWithExpand = {
      ...mockAttempt,
      expand: {
        question: {
          ...mockQuestion,
          expand: {
            document: mockDocument,
          },
        },
      },
    };

    // First call is for total count, second call is for due questions
    mockGetList
      .mockResolvedValueOnce({
        items: [],
        totalItems: 1,
        totalPages: 1,
        page: 1,
        perPage: 1,
      })
      .mockResolvedValueOnce({
        items: [mockAttemptWithExpand],
        totalItems: 1,
        totalPages: 1,
        page: 1,
        perPage: 100,
      });

    const { result } = renderHook(() => useDueQuestions());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Check results
    expect(result.current.totalDue).toBe(1);
    expect(result.current.totalQuestions).toBe(1);
    expect(result.current.questions).toHaveLength(1);
    expect(result.current.questions[0]).toMatchObject({
      id: 'attempt1',
      questionId: 'q1',
      questionText: 'What is the answer?',
      documentId: 'doc1',
      documentTitle: 'Test Document',
    });

    // Check document grouping
    expect(result.current.byDocument.size).toBe(1);
    const docGroup = result.current.byDocument.get('doc1');
    expect(docGroup).toBeDefined();
    expect(docGroup?.count).toBe(1);
    expect(docGroup?.title).toBe('Test Document');
  });

  it('should handle errors gracefully', async () => {
    // First call throws error
    mockGetList.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDueQuestions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.questions).toEqual([]);
  });

  it('should group questions by document', async () => {
    const doc1: ComprehensionDocument = {
      id: 'doc1',
      title: 'Document 1',
      content: 'Content 1',
      source_type: 'paste',
      word_count: 100,
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
    };

    const doc2: ComprehensionDocument = {
      id: 'doc2',
      title: 'Document 2',
      content: 'Content 2',
      source_type: 'paste',
      word_count: 200,
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
    };

    const attempts = [
      {
        id: 'a1',
        question: 'q1',
        stability: 5,
        difficulty: 5,
        due_at: '2024-01-01T00:00:00Z',
        state: 2 as const,
        reps: 1,
        lapses: 0,
        created: '2024-01-01T00:00:00Z',
        expand: {
          question: {
            id: 'q1',
            document: 'doc1',
            question_text: 'Question 1',
            question_type: 'multiple_choice' as const,
            comprehension_type: 'factual_recall' as const,
            correct_answer: 'A',
            rationale: 'Rationale',
            created: '2024-01-01T00:00:00Z',
            expand: { document: doc1 },
          },
        },
      },
      {
        id: 'a2',
        question: 'q2',
        stability: 5,
        difficulty: 5,
        due_at: '2024-01-01T00:00:00Z',
        state: 2 as const,
        reps: 1,
        lapses: 0,
        created: '2024-01-01T00:00:00Z',
        expand: {
          question: {
            id: 'q2',
            document: 'doc1',
            question_text: 'Question 2',
            question_type: 'multiple_choice' as const,
            comprehension_type: 'factual_recall' as const,
            correct_answer: 'B',
            rationale: 'Rationale',
            created: '2024-01-01T00:00:00Z',
            expand: { document: doc1 },
          },
        },
      },
      {
        id: 'a3',
        question: 'q3',
        stability: 5,
        difficulty: 5,
        due_at: '2024-01-01T00:00:00Z',
        state: 2 as const,
        reps: 1,
        lapses: 0,
        created: '2024-01-01T00:00:00Z',
        expand: {
          question: {
            id: 'q3',
            document: 'doc2',
            question_text: 'Question 3',
            question_type: 'multiple_choice' as const,
            comprehension_type: 'factual_recall' as const,
            correct_answer: 'C',
            rationale: 'Rationale',
            created: '2024-01-01T00:00:00Z',
            expand: { document: doc2 },
          },
        },
      },
    ];

    // First call is for total count, second call is for due questions
    mockGetList
      .mockResolvedValueOnce({
        items: [],
        totalItems: 3,
        totalPages: 1,
        page: 1,
        perPage: 1,
      })
      .mockResolvedValueOnce({
        items: attempts,
        totalItems: 3,
        totalPages: 1,
        page: 1,
        perPage: 100,
      });

    const { result } = renderHook(() => useDueQuestions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalDue).toBe(3);
    expect(result.current.byDocument.size).toBe(2);

    const doc1Group = result.current.byDocument.get('doc1');
    expect(doc1Group?.count).toBe(2);
    expect(doc1Group?.title).toBe('Document 1');

    const doc2Group = result.current.byDocument.get('doc2');
    expect(doc2Group?.count).toBe(1);
    expect(doc2Group?.title).toBe('Document 2');
  });
});
