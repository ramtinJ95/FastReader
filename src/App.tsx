import { useState } from 'react';
import { RSVPDisplay } from './components/RSVPDisplay';
import { Controls } from './components/Controls';
import './App.css';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="app">
      <h1>FastReader - Controls Demo</h1>
      <div style={{ width: '100%', height: '300px' }}>
        <RSVPDisplay word="Testing" />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <Controls
          isPlaying={isPlaying}
          isPaused={isPaused}
          onPlay={() => {
            setIsPlaying(true);
            setIsPaused(false);
          }}
          onPause={() => {
            setIsPlaying(false);
            setIsPaused(true);
          }}
          onResume={() => {
            setIsPlaying(true);
            setIsPaused(false);
          }}
          onStop={() => {
            setIsPlaying(false);
            setIsPaused(false);
          }}
          onRestart={() => {
            setIsPlaying(true);
            setIsPaused(false);
          }}
        />
      </div>
      <p style={{ marginTop: '1rem', color: '#666' }}>
        State: {isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Stopped'}
      </p>
    </div>
  );
}

export default App;
