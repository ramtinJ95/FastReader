import { RSVPDisplay } from './components/RSVPDisplay';
import { Controls } from './components/Controls';
import { usePlayback } from './hooks/usePlayback';
import { DEFAULT_SETTINGS } from './types';
import './App.css';

const SAMPLE_TEXT = `Rapid serial visual presentation (RSVP) is a scientific method
for studying the timing of vision that has been adapted for speed reading.
Instead of traditional reading where your eyes scan across lines of text,
RSVP displays one word at a time at a fixed focal point in the center of the screen.
This eliminates eye movements during reading and can potentially increase reading speed significantly.`;

function App() {
  const playback = usePlayback({
    text: SAMPLE_TEXT,
    settings: DEFAULT_SETTINGS,
    onComplete: () => console.log('Playback complete!'),
  });

  const isFocusMode = playback.isPlaying || playback.isPaused;

  return (
    <div className={`app ${isFocusMode ? 'focus-mode' : ''}`}>
      {!isFocusMode && <h1>FastReader</h1>}

      <div className="rsvp-container">
        <RSVPDisplay
          word={playback.currentWord}
          opacity={playback.wordOpacity}
          fadeEnabled={DEFAULT_SETTINGS.fadeEnabled}
          fadeDuration={DEFAULT_SETTINGS.fadeDuration}
        />
      </div>

      <div className="bottom-bar">
        <div className="progress-info">
          <span>
            {playback.currentWordIndex} / {playback.words.length}
          </span>
          <span>{Math.round(playback.progress)}%</span>
        </div>

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
    </div>
  );
}

export default App;
