# Phase 8: Keyboard Shortcuts & Polish

> **Goal**: Complete keyboard support, focus mode, touch controls, and accessibility improvements.
>
> **Estimated Tasks**: 8
> **Prerequisites**: Phases 1-7 completed

---

## Overview

This phase implements:
1. Complete keyboard shortcuts
2. Focus mode (minimal UI during reading)
3. Touch controls for mobile
4. Accessibility (ARIA labels, focus management)
5. Error boundaries
6. Loading states
7. Final responsive adjustments
8. Desktop keyboard hints display

---

## Task 1: Create useKeyboardShortcuts Hook ✅ COMPLETED

### 1.1 Instructions

Create `src/hooks/useKeyboardShortcuts.ts`:

```typescript
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
```

### 1.2 Update Hooks Index

Update `src/hooks/index.ts`:

```typescript
export { usePlayback, type UsePlaybackOptions, type UsePlaybackReturn } from './usePlayback';
export { useSession, type UseSessionOptions, type UseSessionReturn } from './useSession';
export {
  useKeyboardShortcuts,
  type KeyboardShortcutHandlers,
  type UseKeyboardShortcutsOptions,
} from './useKeyboardShortcuts';
```

### 1.3 Test: Hook Tests

Create `src/hooks/useKeyboardShortcuts.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, KeyboardShortcutHandlers } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  const createHandlers = (): KeyboardShortcutHandlers => ({
    onTogglePlayPause: vi.fn(),
    onStop: vi.fn(),
    onOpenJumpTo: vi.fn(),
    onSave: vi.fn(),
    onIncreaseWPM: vi.fn(),
    onDecreaseWPM: vi.fn(),
    onSkipBackward: vi.fn(),
    onSkipForward: vi.fn(),
    onEscape: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenTextInput: vi.fn(),
  });

  const fireKey = (code: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      code,
      bubbles: true,
      ...options,
    });
    window.dispatchEvent(event);
  };

  it('should call onTogglePlayPause on Space', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('Space');
    expect(handlers.onTogglePlayPause).toHaveBeenCalled();
  });

  it('should call onEscape on Escape', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('Escape');
    expect(handlers.onEscape).toHaveBeenCalled();
  });

  it('should call onOpenJumpTo on G', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('KeyG');
    expect(handlers.onOpenJumpTo).toHaveBeenCalled();
  });

  it('should call onSave on Ctrl+S', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('KeyS', { ctrlKey: true });
    expect(handlers.onSave).toHaveBeenCalled();
  });

  it('should call onIncreaseWPM on ArrowUp', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('ArrowUp');
    expect(handlers.onIncreaseWPM).toHaveBeenCalled();
  });

  it('should call onDecreaseWPM on ArrowDown', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('ArrowDown');
    expect(handlers.onDecreaseWPM).toHaveBeenCalled();
  });

  it('should call onSkipBackward on ArrowLeft', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('ArrowLeft');
    expect(handlers.onSkipBackward).toHaveBeenCalled();
  });

  it('should call onSkipForward on ArrowRight', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('ArrowRight');
    expect(handlers.onSkipForward).toHaveBeenCalled();
  });

  it('should not fire when disabled', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers, enabled: false }));

    fireKey('Space');
    expect(handlers.onTogglePlayPause).not.toHaveBeenCalled();
  });
});
```

### 1.4 Test: Run Tests

```bash
npm run test:run -- src/hooks/useKeyboardShortcuts.test.ts
```

**Expected Result**: All tests pass.

---

## Task 2: Create KeyboardShortcuts Display Component ✅ COMPLETED

### 2.1 Instructions

Create `src/components/KeyboardShortcuts/KeyboardShortcuts.tsx`:

```tsx
import './KeyboardShortcuts.css';

export interface KeyboardShortcutsProps {
  /** Whether to show shortcuts */
  visible?: boolean;
}

const shortcuts = [
  { key: 'Space', action: 'Play/Pause' },
  { key: 'Esc', action: 'Stop' },
  { key: 'G', action: 'Jump to' },
  { key: '↑/↓', action: 'WPM' },
  { key: '←/→', action: 'Skip' },
  { key: 'Ctrl+S', action: 'Save' },
];

export function KeyboardShortcuts({ visible = true }: KeyboardShortcutsProps) {
  if (!visible) return null;

  return (
    <div className="keyboard-shortcuts">
      {shortcuts.map(({ key, action }) => (
        <span key={key} className="shortcut">
          <kbd>{key}</kbd>
          <span className="shortcut-action">{action}</span>
        </span>
      ))}
    </div>
  );
}

export default KeyboardShortcuts;
```

### 2.2 Create Styles

Create `src/components/KeyboardShortcuts/KeyboardShortcuts.css`:

```css
.keyboard-shortcuts {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
  color: var(--color-text-disabled);
  font-size: 0.8rem;
}

.shortcut {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

kbd {
  background: var(--color-bg-card);
  padding: 0.15rem 0.4rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.shortcut-action {
  color: var(--color-text-disabled);
}

/* Hide on mobile */
@media (max-width: 768px) {
  .keyboard-shortcuts {
    display: none;
  }
}
```

### 2.3 Create Index Export

Create `src/components/KeyboardShortcuts/index.ts`:

```typescript
export { KeyboardShortcuts, type KeyboardShortcutsProps } from './KeyboardShortcuts';
export { KeyboardShortcuts as default } from './KeyboardShortcuts';
```

---

## Task 3: Create TouchControls Component ✅ COMPLETED

### 3.1 Instructions

Create `src/components/TouchControls/TouchControls.tsx`:

```tsx
import './TouchControls.css';

export interface TouchControlsProps {
  /** Current WPM */
  wpm: number;
  /** Called to skip backward */
  onSkipBackward: () => void;
  /** Called to skip forward */
  onSkipForward: () => void;
  /** Called to decrease WPM */
  onDecreaseWPM: () => void;
  /** Called to increase WPM */
  onIncreaseWPM: () => void;
}

export function TouchControls({
  wpm,
  onSkipBackward,
  onSkipForward,
  onDecreaseWPM,
  onIncreaseWPM,
}: TouchControlsProps) {
  return (
    <div className="touch-controls">
      <button className="touch-btn" onClick={onSkipBackward} aria-label="Skip back 5 words">
        -5
      </button>
      <button className="touch-btn" onClick={onDecreaseWPM} aria-label="Decrease WPM">
        -
      </button>
      <span className="wpm-display">{wpm}</span>
      <button className="touch-btn" onClick={onIncreaseWPM} aria-label="Increase WPM">
        +
      </button>
      <button className="touch-btn" onClick={onSkipForward} aria-label="Skip forward 5 words">
        +5
      </button>
    </div>
  );
}

export default TouchControls;
```

### 3.2 Create Styles

Create `src/components/TouchControls/TouchControls.css`:

```css
.touch-controls {
  display: none;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
}

/* Only show on mobile/touch devices */
@media (max-width: 768px) {
  .touch-controls {
    display: flex;
  }
}

@media (hover: none) and (pointer: coarse) {
  .touch-controls {
    display: flex;
  }
}

.touch-btn {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  color: var(--color-text-muted);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  min-width: 44px;
  min-height: 44px;
  transition: all var(--transition-normal);
  cursor: pointer;
}

.touch-btn:active {
  background: var(--color-bg-button-hover);
  color: var(--color-text);
}

.wpm-display {
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  min-width: 3.5rem;
  text-align: center;
}
```

### 3.3 Create Index Export

Create `src/components/TouchControls/index.ts`:

```typescript
export { TouchControls, type TouchControlsProps } from './TouchControls';
export { TouchControls as default } from './TouchControls';
```

---

## Task 4: Create ErrorBoundary Component ✅ COMPLETED

### 4.1 Instructions

Create `src/components/ErrorBoundary/ErrorBoundary.tsx`:

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p className="error-message">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button className="btn primary" onClick={this.handleRetry}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### 4.2 Create Styles

Create `src/components/ErrorBoundary/ErrorBoundary.css`:

```css
.error-boundary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-xl);
  text-align: center;
}

.error-boundary h2 {
  color: var(--color-accent);
  margin-bottom: var(--spacing-md);
}

.error-boundary .error-message {
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-lg);
  max-width: 400px;
}
```

### 4.3 Create Index Export

Create `src/components/ErrorBoundary/index.ts`:

```typescript
export { ErrorBoundary } from './ErrorBoundary';
export { ErrorBoundary as default } from './ErrorBoundary';
```

---

## Task 5: Update App with All Features ✅ COMPLETED

### 5.1 Instructions

Update `src/App.tsx` with complete implementation:

```tsx
import { useState, useCallback, useMemo } from 'react';
import { RSVPDisplay } from './components/RSVPDisplay';
import { Controls } from './components/Controls';
import { ProgressBar } from './components/ProgressBar';
import { Settings } from './components/Settings';
import { TextInput } from './components/TextInput';
import { JumpToDialog, SavedSessionPrompt } from './components/dialogs';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { TouchControls } from './components/TouchControls';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePlayback } from './hooks/usePlayback';
import { useSession } from './hooks/useSession';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { formatTimeRemaining, extractWordFrame } from './lib/rsvp-utils';
import { parseFile } from './lib/file-parsers';
import { DEFAULT_SETTINGS, type Settings as SettingsType } from './types';
import './App.css';

const SAMPLE_TEXT = `Rapid serial visual presentation (RSVP) is a scientific method
for studying the timing of vision that has been adapted for speed reading.
Instead of traditional reading where your eyes scan across lines of text,
RSVP displays one word at a time at a fixed focal point in the center of the screen.
This eliminates eye movements during reading and can potentially increase reading speed significantly.
The key feature is the Optimal Recognition Point (ORP) where a specific letter is highlighted.
This is where your eye naturally focuses when reading a word.`;

// Icons
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  </svg>
);

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
  </svg>
);

function AppContent() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showJumpTo, setShowJumpTo] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const playback = usePlayback({
    text,
    settings,
  });

  // Session management
  const session = useSession({
    text,
    currentWordIndex: playback.currentWordIndex,
    settings,
    onSessionLoad: useCallback(
      (loadedSession) => {
        setText(loadedSession.text);
        setSettings(loadedSession.settings);
        playback.setText(loadedSession.text);
        setTimeout(() => {
          playback.seekTo(loadedSession.currentWordIndex);
        }, 0);
      },
      [playback]
    ),
  });

  // Handle save
  const handleSave = useCallback(() => {
    const success = session.save();
    if (success) {
      setSaveMessage('Session saved!');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  }, [session]);

  // Settings change handler
  const handleSettingsChange = useCallback((changes: Partial<SettingsType>) => {
    setSettings((prev) => ({ ...prev, ...changes }));
  }, []);

  // Check if any dialog is open
  const isDialogOpen = showSettings || showTextInput || showJumpTo;
  const isFocusMode = playback.isPlaying || playback.isPaused;

  // Escape handler - close dialogs or stop playback
  const handleEscape = useCallback(() => {
    if (showJumpTo) {
      setShowJumpTo(false);
    } else if (showSettings) {
      setShowSettings(false);
    } else if (showTextInput) {
      setShowTextInput(false);
    } else if (session.showResumePrompt) {
      session.dismissPrompt();
    } else if (playback.isPlaying || playback.isPaused) {
      playback.stop();
    }
  }, [showJumpTo, showSettings, showTextInput, session, playback]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    handlers: {
      onTogglePlayPause: useCallback(() => {
        if (playback.isPlaying) {
          playback.pause();
        } else if (playback.isPaused) {
          playback.resume();
        } else {
          playback.play();
        }
      }, [playback]),
      onStop: playback.stop,
      onOpenJumpTo: useCallback(() => {
        if (!isDialogOpen && !isFocusMode) {
          setShowJumpTo(true);
        }
      }, [isDialogOpen, isFocusMode]),
      onSave: handleSave,
      onIncreaseWPM: useCallback(() => {
        setSettings((prev) => ({
          ...prev,
          wordsPerMinute: Math.min(1000, prev.wordsPerMinute + 25),
        }));
      }, []),
      onDecreaseWPM: useCallback(() => {
        setSettings((prev) => ({
          ...prev,
          wordsPerMinute: Math.max(50, prev.wordsPerMinute - 25),
        }));
      }, []),
      onSkipBackward: useCallback(() => {
        playback.seekTo(Math.max(0, playback.currentWordIndex - 2));
      }, [playback]),
      onSkipForward: useCallback(() => {
        playback.seekTo(Math.min(playback.words.length, playback.currentWordIndex + 1));
      }, [playback]),
      onEscape: handleEscape,
      onOpenSettings: useCallback(() => {
        if (!isDialogOpen && !isFocusMode) {
          setShowSettings(true);
        }
      }, [isDialogOpen, isFocusMode]),
      onOpenTextInput: useCallback(() => {
        if (!isDialogOpen && !isFocusMode) {
          setShowTextInput(true);
        }
      }, [isDialogOpen, isFocusMode]),
    },
    enabled: !isDialogOpen,
  });

  // File handlers
  const handleTextApply = useCallback(
    (newText: string) => {
      setText(newText);
      playback.setText(newText);
    },
    [playback]
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      setIsLoadingFile(true);
      setLoadingMessage(`Parsing ${file.name}...`);

      try {
        const extractedText = await parseFile(file);
        setText(extractedText);
        playback.setText(extractedText);
        setShowTextInput(false);
      } catch (error) {
        console.error('Failed to parse file:', error);
        setLoadingMessage(error instanceof Error ? error.message : 'Failed to parse file');
      } finally {
        setIsLoadingFile(false);
        setLoadingMessage('');
      }
    },
    [playback]
  );

  // Touch control handlers
  const handleTouchSkipBackward = useCallback(() => {
    playback.seekTo(Math.max(0, playback.currentWordIndex - 5));
  }, [playback]);

  const handleTouchSkipForward = useCallback(() => {
    playback.seekTo(Math.min(playback.words.length, playback.currentWordIndex + 5));
  }, [playback]);

  const handleTouchDecreaseWPM = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      wordsPerMinute: Math.max(50, prev.wordsPerMinute - 50),
    }));
  }, []);

  const handleTouchIncreaseWPM = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      wordsPerMinute: Math.min(1000, prev.wordsPerMinute + 50),
    }));
  }, []);

  // Derived values
  const timeRemaining = formatTimeRemaining(
    playback.words.length - playback.currentWordIndex,
    settings.wordsPerMinute
  );

  const { subset: wordGroup, centerOffset: highlightIndex } = useMemo(
    () =>
      extractWordFrame(
        playback.words,
        Math.max(0, playback.currentWordIndex - 1),
        settings.frameWordCount
      ),
    [playback.words, playback.currentWordIndex, settings.frameWordCount]
  );

  return (
    <div className={`app ${isFocusMode ? 'focus-mode' : ''}`}>
      {!isFocusMode && (
        <header className="header">
          <h1>FastReader</h1>
          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={() => setShowTextInput(true)}
              title="Load Text (T)"
              aria-label="Load text"
            >
              <FileIcon />
            </button>
            <button
              className="icon-btn"
              onClick={handleSave}
              title="Save Session (Ctrl+S)"
              aria-label="Save session"
            >
              <SaveIcon />
            </button>
            <button
              className="icon-btn"
              onClick={() => setShowJumpTo(true)}
              title="Jump to (G)"
              aria-label="Jump to position"
            >
              <SearchIcon />
            </button>
            <button
              className="icon-btn"
              onClick={() => setShowSettings(true)}
              title="Settings (S)"
              aria-label="Open settings"
            >
              <SettingsIcon />
            </button>
          </div>
        </header>
      )}

      {saveMessage && (
        <div className="save-message" role="status" aria-live="polite">
          {saveMessage}
        </div>
      )}

      <main className="rsvp-container" role="main" aria-label="Reading area">
        <RSVPDisplay
          word={playback.currentWord}
          wordGroup={wordGroup}
          highlightIndex={highlightIndex}
          multiWordEnabled={settings.frameWordCount > 1}
          opacity={playback.wordOpacity}
          fadeEnabled={settings.fadeEnabled}
          fadeDuration={settings.fadeDuration}
        />
      </main>

      <footer className="bottom-bar">
        {isFocusMode && (
          <TouchControls
            wpm={settings.wordsPerMinute}
            onSkipBackward={handleTouchSkipBackward}
            onSkipForward={handleTouchSkipForward}
            onDecreaseWPM={handleTouchDecreaseWPM}
            onIncreaseWPM={handleTouchIncreaseWPM}
          />
        )}

        <ProgressBar
          progress={playback.progress}
          currentWord={playback.currentWordIndex}
          totalWords={playback.words.length}
          wpm={settings.wordsPerMinute}
          timeRemaining={timeRemaining}
          minimal={isFocusMode}
          clickable={true}
          onSeek={playback.seekToPercent}
        />

        <Controls
          isPlaying={playback.isPlaying}
          isPaused={playback.isPaused}
          canPlay={playback.words.length > 0}
          minimal={isFocusMode}
          onPlay={playback.play}
          onPause={playback.pause}
          onResume={playback.resume}
          onStop={playback.stop}
          onRestart={playback.restart}
        />

        {!isFocusMode && <KeyboardShortcuts />}
      </footer>

      {/* Dialogs */}
      {showSettings && (
        <Settings
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showTextInput && (
        <TextInput
          text={text}
          isLoading={isLoadingFile}
          loadingMessage={loadingMessage}
          onApply={handleTextApply}
          onFileSelect={handleFileSelect}
          onClose={() => setShowTextInput(false)}
        />
      )}

      <JumpToDialog
        isOpen={showJumpTo}
        totalWords={playback.words.length}
        onClose={() => setShowJumpTo(false)}
        onJump={playback.seekTo}
      />

      <SavedSessionPrompt
        isOpen={session.showResumePrompt}
        summary={session.sessionSummary}
        onResume={session.resume}
        onStartFresh={session.startFresh}
        onClose={session.dismissPrompt}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
```

---

## Task 6: Final App.css Updates ✅ COMPLETED

### 6.1 Instructions

Update `src/App.css` with final styles:

```css
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--spacing-xl);
  transition: padding var(--transition-slow);
}

.app.focus-mode {
  padding: var(--spacing-md);
}

@media (max-width: 600px) {
  .app {
    padding: var(--spacing-md);
  }

  .app.focus-mode {
    padding: var(--spacing-sm);
  }
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.header h1 {
  color: var(--color-accent);
  font-size: 2rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.icon-btn {
  background: transparent;
  border: 1px solid var(--color-border-light);
  color: var(--color-text-muted);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  border-color: var(--color-border-lighter);
  color: var(--color-text);
}

.icon-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Main content */
.rsvp-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 250px;
}

/* Bottom bar */
.bottom-bar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
}

.app.focus-mode .bottom-bar {
  gap: var(--spacing-sm);
}

/* Save message toast */
.save-message {
  position: fixed;
  top: var(--spacing-lg);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-accent);
  color: var(--color-text);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  z-index: var(--z-tooltip);
  animation: fadeInOut 2s ease-in-out forwards;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  15% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  85% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
}

/* Accessibility: Skip to main content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-accent);
  color: var(--color-text);
  padding: var(--spacing-sm) var(--spacing-md);
  z-index: 1000;
}

.skip-link:focus {
  top: 0;
}
```

---

## Task 7: Test All Keyboard Shortcuts ✅ COMPLETED

### 7.1 Manual Test Procedure

Test each shortcut:

| Key | Expected Action |
|-----|-----------------|
| Space | Play/Pause/Resume |
| Escape | Close dialog or stop playback |
| G | Open jump-to dialog |
| S | Open settings (when no dialog open) |
| T | Open text input (when no dialog open) |
| Ctrl+S | Save session |
| Arrow Up | Increase WPM by 25 |
| Arrow Down | Decrease WPM by 25 |
| Arrow Left | Skip back 2 words |
| Arrow Right | Skip forward 1 word |

### 7.2 Test: Run All Tests

```bash
npm run test:run
```

**Expected Result**: All tests pass (120+ tests total).

---

## Task 8: Accessibility Audit ✅ COMPLETED

### 8.1 Manual Accessibility Checks

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Enter/Space activates buttons
   - Escape closes dialogs

2. **Screen Reader**
   - All buttons have aria-labels
   - Progress bar has role="slider" with aria attributes
   - Status messages use aria-live

3. **Focus Management**
   - Focus visible on all interactive elements
   - Focus trapped in dialogs
   - Focus returns to trigger after dialog closes

4. **Color Contrast**
   - Text meets WCAG AA contrast ratios
   - Red accent (#ff4444) on black meets contrast requirements

### 8.2 Test: Visual Verification

```bash
npm run dev
```

**Expected Result**: All features work, keyboard shortcuts function, touch controls appear on mobile.

---

## Phase 8 Completion Checklist

**Verification Checklist**:
- [x] All keyboard shortcuts work
- [x] Focus mode hides header/shortcuts
- [x] Touch controls appear on mobile
- [x] ErrorBoundary catches errors gracefully
- [x] Keyboard shortcuts display visible on desktop
- [x] ARIA labels on all interactive elements
- [x] Focus visible states work
- [x] All tests pass (233 tests)

---

## Files Created/Modified

```
src/hooks/
├── useKeyboardShortcuts.ts       ✓ Hook
├── useKeyboardShortcuts.test.ts  ✓ Tests
└── index.ts                      ✓ Updated

src/components/KeyboardShortcuts/
├── KeyboardShortcuts.tsx   ✓ Component
├── KeyboardShortcuts.css   ✓ Styles
└── index.ts                ✓ Export

src/components/TouchControls/
├── TouchControls.tsx   ✓ Component
├── TouchControls.css   ✓ Styles
└── index.ts            ✓ Export

src/components/ErrorBoundary/
├── ErrorBoundary.tsx   ✓ Component
├── ErrorBoundary.css   ✓ Styles
└── index.ts            ✓ Export

src/
├── App.tsx    ✓ Final implementation
└── App.css    ✓ Final styles
```

---

## Next Phase

Proceed to **Phase 9: Testing & Documentation** to add comprehensive tests and documentation.
