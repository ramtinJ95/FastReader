import { useState } from 'react';
import { RSVPDisplay } from './components/RSVPDisplay';
import { Controls } from './components/Controls';
import { ProgressBar } from './components/ProgressBar';
import { JumpToDialog } from './components/dialogs';
import { usePlayback } from './hooks/usePlayback';
import { formatTimeRemaining } from './lib/rsvp-utils';
import { DEFAULT_SETTINGS } from './types';
import './App.css';

const SAMPLE_TEXT = `Rapid serial visual presentation (RSVP) is a scientific method
for studying the timing of vision that has been adapted for speed reading.
Instead of traditional reading where your eyes scan across lines of text,
RSVP displays one word at a time at a fixed focal point in the center of the screen.
This eliminates eye movements during reading and can potentially increase reading speed significantly.
The key feature is the Optimal Recognition Point (ORP) where a specific letter is highlighted.
This is where your eye naturally focuses when reading a word.`;

function App() {
  const [showJumpTo, setShowJumpTo] = useState(false);

  const playback = usePlayback({
    text: SAMPLE_TEXT,
    settings: DEFAULT_SETTINGS,
    onComplete: () => console.log('Playback complete!'),
  });

  const isFocusMode = playback.isPlaying || playback.isPaused;
  const timeRemaining = formatTimeRemaining(
    playback.words.length - playback.currentWordIndex,
    DEFAULT_SETTINGS.wordsPerMinute
  );

  return (
    <div className={`app ${isFocusMode ? 'focus-mode' : ''}`}>
      {!isFocusMode && (
        <header className="header">
          <h1>FastReader</h1>
          <button
            className="icon-btn"
            onClick={() => setShowJumpTo(true)}
            title="Jump to (G)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </button>
        </header>
      )}

      <div className="rsvp-container">
        <RSVPDisplay
          word={playback.currentWord}
          opacity={playback.wordOpacity}
          fadeEnabled={DEFAULT_SETTINGS.fadeEnabled}
          fadeDuration={DEFAULT_SETTINGS.fadeDuration}
        />
      </div>

      <div className="bottom-bar">
        <ProgressBar
          progress={playback.progress}
          currentWord={playback.currentWordIndex}
          totalWords={playback.words.length}
          wpm={DEFAULT_SETTINGS.wordsPerMinute}
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
    </div>
  );
}

export default App;
