import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutHandlers {
  /** Toggle play/pause */
  onTogglePlayPause: () => void;
  /** Stop playback */
  onStop: () => void;
  /** Open jump-to dialog */
  onOpenJumpTo: () => void;
  /** Save session */
  onSave: () => void;
  /** Increase WPM */
  onIncreaseWPM: () => void;
  /** Decrease WPM */
  onDecreaseWPM: () => void;
  /** Skip backward */
  onSkipBackward: () => void;
  /** Skip forward */
  onSkipForward: () => void;
  /** Close any open panel */
  onEscape: () => void;
  /** Open settings */
  onOpenSettings?: () => void;
  /** Open text input */
  onOpenTextInput?: () => void;
}

export interface UseKeyboardShortcutsOptions {
  /** Handlers for keyboard shortcuts */
  handlers: KeyboardShortcutHandlers;
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Elements to exclude (e.g., when typing in input) */
  excludeElements?: string[];
}

export function useKeyboardShortcuts({
  handlers,
  enabled = true,
  excludeElements = ['INPUT', 'TEXTAREA'],
}: UseKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore when typing in inputs
      const target = event.target as HTMLElement;
      if (excludeElements.includes(target.tagName)) return;

      // Check for modifier keys
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          handlers.onTogglePlayPause();
          break;

        case 'Escape':
          handlers.onEscape();
          break;

        case 'KeyG':
          if (!isCtrlOrCmd) {
            event.preventDefault();
            handlers.onOpenJumpTo();
          }
          break;

        case 'KeyS':
          if (isCtrlOrCmd) {
            event.preventDefault();
            handlers.onSave();
          } else if (handlers.onOpenSettings) {
            event.preventDefault();
            handlers.onOpenSettings();
          }
          break;

        case 'KeyT':
          if (handlers.onOpenTextInput) {
            event.preventDefault();
            handlers.onOpenTextInput();
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          handlers.onIncreaseWPM();
          break;

        case 'ArrowDown':
          event.preventDefault();
          handlers.onDecreaseWPM();
          break;

        case 'ArrowLeft':
          event.preventDefault();
          handlers.onSkipBackward();
          break;

        case 'ArrowRight':
          event.preventDefault();
          handlers.onSkipForward();
          break;
      }
    },
    [handlers, enabled, excludeElements]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
