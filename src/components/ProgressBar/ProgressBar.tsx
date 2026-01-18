import { useCallback, KeyboardEvent, MouseEvent } from 'react';
import './ProgressBar.css';

export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Current word index */
  currentWord: number;
  /** Total word count */
  totalWords: number;
  /** Words per minute */
  wpm: number;
  /** Formatted time remaining (e.g., "2:30") */
  timeRemaining: string;
  /** Minimal mode - thin bar, no stats */
  minimal?: boolean;
  /** Enable click-to-seek */
  clickable?: boolean;
  /** Called when user seeks to a position */
  onSeek?: (percentage: number) => void;
}

export function ProgressBar({
  progress,
  currentWord,
  totalWords,
  wpm,
  timeRemaining,
  minimal = false,
  clickable = false,
  onSeek,
}: ProgressBarProps) {
  // Handle click to seek
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!clickable || !onSeek) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      onSeek(Math.max(0, Math.min(100, percentage)));
    },
    [clickable, onSeek]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!clickable || !onSeek) return;

      const step = event.shiftKey ? 10 : 1;

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          event.preventDefault();
          onSeek(Math.max(0, progress - step));
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          event.preventDefault();
          onSeek(Math.min(100, progress + step));
          break;
        case 'Home':
          event.preventDefault();
          onSeek(0);
          break;
        case 'End':
          event.preventDefault();
          onSeek(100);
          break;
      }
    },
    [clickable, onSeek, progress]
  );

  return (
    <div className={`progress-wrapper ${minimal ? 'minimal' : ''}`}>
      <div
        className={`progress-container ${clickable ? 'clickable' : ''}`}
        role={clickable ? 'slider' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-valuenow={clickable ? Math.round(progress) : undefined}
        aria-valuemin={clickable ? 0 : undefined}
        aria-valuemax={clickable ? 100 : undefined}
        aria-label={clickable ? 'Reading progress' : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {!minimal && (
        <div className="stats">
          <span className="stat">
            {currentWord} / {totalWords}
          </span>
          <span className="stat wpm">{wpm} WPM</span>
          <span className="stat">{timeRemaining}</span>
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
