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
  const [fileError, setFileError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const playback = usePlayback({
    text,
    settings,
  });

  // Destructure stable playback methods for use in callbacks
  const { setText: setPlaybackText, seekTo: playbackSeekTo } = playback;

  // Session management
  const session = useSession({
    text,
    currentWordIndex: playback.currentWordIndex,
    settings,
    onSessionLoad: useCallback(
      (loadedSession: { text: string; currentWordIndex: number; settings: SettingsType }) => {
        setText(loadedSession.text);
        setSettings(loadedSession.settings);
        setPlaybackText(loadedSession.text);
        setTimeout(() => {
          playbackSeekTo(loadedSession.currentWordIndex);
        }, 0);
      },
      [setPlaybackText, playbackSeekTo]
    ),
  });

  // Handle save
  const handleSave = useCallback(() => {
    const result = session.save();
    if (result.success) {
      setSaveMessage('Session saved!');
      setTimeout(() => setSaveMessage(''), 2000);
    } else if (result.reason === 'size_exceeded') {
      setSaveMessage('Document too large to save');
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      setSaveMessage('Failed to save session');
      setTimeout(() => setSaveMessage(''), 3000);
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
      setPlaybackText(newText);
    },
    [setPlaybackText]
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      setIsLoadingFile(true);
      setLoadingMessage(`Parsing ${file.name}...`);
      setFileError('');

      try {
        const extractedText = await parseFile(file);
        setText(extractedText);
        setPlaybackText(extractedText);
        setShowTextInput(false);
      } catch (error) {
        console.error('Failed to parse file:', error);
        setFileError(error instanceof Error ? error.message : 'Failed to parse file');
      } finally {
        setIsLoadingFile(false);
        setLoadingMessage('');
      }
    },
    [setPlaybackText]
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

  // Derived values - use currentWpm from playback for accurate time remaining with ramp-up
  const timeRemaining = formatTimeRemaining(
    playback.words.length - playback.currentWordIndex,
    playback.currentWpm
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
            wpm={playback.currentWpm}
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
          wpm={playback.currentWpm}
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
          fileError={fileError}
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
