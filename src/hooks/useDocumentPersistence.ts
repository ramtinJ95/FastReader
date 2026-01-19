/**
 * Document Persistence Hook
 *
 * Handles saving documents to PocketBase and managing the
 * relationship between local RSVP state and persistent storage.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useComprehension } from '../contexts/ComprehensionContext';
import type { CreateDocumentInput } from '../types/comprehension';

interface UseDocumentPersistenceOptions {
  onSessionLoaded?: (text: string, wordIndex: number, settings: { wpm: number }) => void;
}

interface UseDocumentPersistenceReturn {
  saveDocument: (title: string, content: string, sourceType: 'paste' | 'file' | 'url', filePath?: string) => Promise<void>;
  syncProgress: (wordIndex: number, totalWords: number) => void;
  isBackendAvailable: boolean;
  isLoading: boolean;
}

const PROGRESS_SYNC_INTERVAL = 2000;

export function useDocumentPersistence(
  options: UseDocumentPersistenceOptions = {}
): UseDocumentPersistenceReturn {
  const { onSessionLoaded } = options;

  const {
    connectionStatus,
    currentSession,
    currentDocument,
    isLoading,
    isInitialized,
    startNewSession,
    updateProgress,
  } = useComprehension();

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgressRef = useRef<{ wordIndex: number; percent: number } | null>(null);
  const isMountedRef = useRef(true);

  const isBackendAvailable = connectionStatus === 'connected';

  // Load existing session on mount
  useEffect(() => {
    if (!isInitialized || !isBackendAvailable) return;
    if (!currentSession || !currentDocument) return;
    if (!onSessionLoaded) return;

    onSessionLoaded(
      currentDocument.content,
      currentSession.current_word_index,
      { wpm: currentSession.wpm_setting }
    );
  }, [isInitialized, isBackendAvailable, currentSession, currentDocument, onSessionLoaded]);

  const saveDocument = useCallback(async (
    title: string,
    content: string,
    sourceType: 'paste' | 'file' | 'url',
    filePath?: string
  ) => {
    if (!isBackendAvailable) {
      console.warn('Backend not available, document will not be persisted');
      return;
    }

    const words = content.trim().split(/\s+/);
    const wordCount = words.length;

    const input: CreateDocumentInput = {
      title: title || `Document ${new Date().toLocaleDateString()}`,
      content,
      source_type: sourceType,
      source_path: filePath,
      word_count: wordCount,
    };

    await startNewSession(input);
  }, [isBackendAvailable, startNewSession]);

  const syncProgress = useCallback((wordIndex: number, totalWords: number) => {
    if (!isBackendAvailable || !currentSession) return;

    const percent = Math.round((wordIndex / totalWords) * 100);
    pendingProgressRef.current = { wordIndex, percent };

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for trailing edge debounce
    debounceTimerRef.current = setTimeout(() => {
      if (pendingProgressRef.current && isMountedRef.current) {
        updateProgress(
          pendingProgressRef.current.wordIndex,
          pendingProgressRef.current.percent
        );
        pendingProgressRef.current = null;
      }
      debounceTimerRef.current = null;
    }, PROGRESS_SYNC_INTERVAL);
  }, [isBackendAvailable, currentSession, updateProgress]);

  // Track mount state and flush pending progress on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Clear any pending timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Flush pending progress immediately on unmount
      if (pendingProgressRef.current) {
        const { wordIndex, percent } = pendingProgressRef.current;
        pendingProgressRef.current = null;
        // Use a synchronous-like approach by calling updateProgress directly
        // Note: This may not complete if the component unmounts during navigation,
        // but it's the best effort we can make without a more complex solution
        updateProgress(wordIndex, percent);
      }
    };
  }, [updateProgress]);

  return {
    saveDocument,
    syncProgress,
    isBackendAvailable,
    isLoading,
  };
}
