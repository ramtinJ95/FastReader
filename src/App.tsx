import { useState, useCallback } from 'react';
import { RSVPDisplay } from './components/RSVPDisplay';
import { Controls } from './components/Controls';
import { ProgressBar } from './components/ProgressBar';
import { Settings } from './components/Settings';
import { TextInput } from './components/TextInput';
import { JumpToDialog } from './components/dialogs';
import { usePlayback } from './hooks/usePlayback';
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

// Settings icon
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

// Search icon
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

// File icon
const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  </svg>
);

function App() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showJumpTo, setShowJumpTo] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const playback = usePlayback({
    text,
    settings,
  });

  const handleSettingsChange = useCallback((changes: Partial<SettingsType>) => {
    setSettings((prev) => ({ ...prev, ...changes }));
  }, []);

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
        setLoadingMessage(
          error instanceof Error ? error.message : 'Failed to parse file'
        );
      } finally {
        setIsLoadingFile(false);
        setLoadingMessage('');
      }
    },
    [playback]
  );

  const isFocusMode = playback.isPlaying || playback.isPaused;
  const timeRemaining = formatTimeRemaining(
    playback.words.length - playback.currentWordIndex,
    settings.wordsPerMinute
  );

  // Get word frame for multi-word mode
  const { subset: wordGroup, centerOffset: highlightIndex } = extractWordFrame(
    playback.words,
    Math.max(0, playback.currentWordIndex - 1),
    settings.frameWordCount
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
              title="Load Text"
            >
              <FileIcon />
            </button>
            <button
              className="icon-btn"
              onClick={() => setShowJumpTo(true)}
              title="Jump to (G)"
            >
              <SearchIcon />
            </button>
            <button
              className="icon-btn"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <SettingsIcon />
            </button>
          </div>
        </header>
      )}

      <div className="rsvp-container">
        <RSVPDisplay
          word={playback.currentWord}
          wordGroup={wordGroup}
          highlightIndex={highlightIndex}
          multiWordEnabled={settings.frameWordCount > 1}
          opacity={playback.wordOpacity}
          fadeEnabled={settings.fadeEnabled}
          fadeDuration={settings.fadeDuration}
        />
      </div>

      <div className="bottom-bar">
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
      </div>

      <JumpToDialog
        isOpen={showJumpTo}
        totalWords={playback.words.length}
        onClose={() => setShowJumpTo(false)}
        onJump={playback.seekTo}
      />

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
    </div>
  );
}

export default App;
