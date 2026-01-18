import './Controls.css';

// SVG Icons as components
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h12v12H6z" />
  </svg>
);

const RestartIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
  </svg>
);

export interface ControlsProps {
  /** Whether playback is currently active */
  isPlaying: boolean;
  /** Whether playback is paused */
  isPaused: boolean;
  /** Whether play button should be enabled */
  canPlay?: boolean;
  /** Minimal mode - circular icon-only buttons */
  minimal?: boolean;
  /** Called when play is clicked */
  onPlay: () => void;
  /** Called when pause is clicked */
  onPause: () => void;
  /** Called when resume is clicked */
  onResume: () => void;
  /** Called when stop is clicked */
  onStop: () => void;
  /** Called when restart is clicked */
  onRestart: () => void;
}

export function Controls({
  isPlaying,
  isPaused,
  canPlay = true,
  minimal = false,
  onPlay,
  onPause,
  onResume,
  onStop,
  onRestart,
}: ControlsProps) {
  return (
    <div className={`controls ${minimal ? 'minimal' : ''}`}>
      {/* Play/Pause/Resume button - changes based on state */}
      {!isPlaying && !isPaused ? (
        <button
          className="control-btn play"
          onClick={onPlay}
          disabled={!canPlay}
          title="Play (Space)"
          aria-label="Play"
        >
          <PlayIcon />
          {!minimal && <span>Play</span>}
        </button>
      ) : isPlaying ? (
        <button
          className="control-btn pause"
          onClick={onPause}
          title="Pause (Space)"
          aria-label="Pause"
        >
          <PauseIcon />
          {!minimal && <span>Pause</span>}
        </button>
      ) : (
        <button
          className="control-btn play"
          onClick={onResume}
          title="Resume (Space)"
          aria-label="Resume"
        >
          <PlayIcon />
          {!minimal && <span>Resume</span>}
        </button>
      )}

      {/* Stop button */}
      <button
        className="control-btn stop"
        onClick={onStop}
        disabled={!isPlaying && !isPaused}
        title="Stop (Esc)"
        aria-label="Stop"
      >
        <StopIcon />
        {!minimal && <span>Stop</span>}
      </button>

      {/* Restart button - only in non-minimal mode */}
      {!minimal && (
        <button
          className="control-btn restart"
          onClick={onRestart}
          disabled={!canPlay}
          title="Restart"
          aria-label="Restart"
        >
          <RestartIcon />
          <span>Restart</span>
        </button>
      )}
    </div>
  );
}

export default Controls;
