import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useReviewStats } from './useReviewStats';
import * as pocketbaseService from '../services/pocketbase';

vi.mock('../services/pocketbase');

describe('useReviewStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and display review statistics', async () => {
    // Mock PocketBase responses
    const mockPb = {
      collection: vi.fn((_collectionName: string) => ({
        getList: vi.fn((_page: number, _perPage: number, options?: any) => {
          if (!options?.filter) {
            // Total attempts
            return Promise.resolve({
              items: [{}, {}], // 2 total attempts
              totalItems: 2,
            });
          }
          if (options.filter === 'is_correct = true') {
            // Correct attempts
            return Promise.resolve({
              items: [{}], // 1 correct
              totalItems: 1,
            });
          }
          if (options.filter === 'state = 0') {
            return Promise.resolve({ items: [], totalItems: 0 }); // new
          }
          if (options.filter === 'state = 1') {
            return Promise.resolve({ items: [{}], totalItems: 1 }); // learning
          }
          if (options.filter === 'state = 2') {
            return Promise.resolve({ items: [{}], totalItems: 1 }); // review
          }
          if (options.filter === 'state = 3') {
            return Promise.resolve({ items: [], totalItems: 0 }); // relearning
          }
          return Promise.resolve({ items: [], totalItems: 0 });
        }),
      })),
    };

    vi.mocked(pocketbaseService.getPocketBase).mockReturnValue(mockPb as any);

    // Render hook
    const { result } = renderHook(() => useReviewStats());

    // Should start as loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Check results
    expect(result.current.totalQuestionsAnswered).toBe(2);
    expect(result.current.correctCount).toBe(1);
    expect(result.current.accuracyRate).toBe(0.5); // 1/2 = 50%
    expect(result.current.questionsByState.new).toBe(0);
    expect(result.current.questionsByState.learning).toBe(1);
    expect(result.current.questionsByState.review).toBe(1);
    expect(result.current.questionsByState.relearning).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should handle zero attempts gracefully', async () => {
    const mockPb = {
      collection: vi.fn(() => ({
        getList: vi.fn(() =>
          Promise.resolve({
            items: [],
            totalItems: 0,
          })
        ),
      })),
    };

    vi.mocked(pocketbaseService.getPocketBase).mockReturnValue(mockPb as any);

    const { result } = renderHook(() => useReviewStats());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalQuestionsAnswered).toBe(0);
    expect(result.current.correctCount).toBe(0);
    expect(result.current.accuracyRate).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    const mockPb = {
      collection: vi.fn(() => ({
        getList: vi.fn(() => Promise.reject(new Error('Network error'))),
      })),
    };

    vi.mocked(pocketbaseService.getPocketBase).mockReturnValue(mockPb as any);

    const { result } = renderHook(() => useReviewStats());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.totalQuestionsAnswered).toBe(0);
  });
});
