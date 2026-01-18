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
