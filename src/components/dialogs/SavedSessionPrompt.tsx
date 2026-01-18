import { formatRelativeTime } from '../../lib/date-utils';
import './dialogs.css';

export interface SavedSessionPromptProps {
  /** Whether the prompt is open */
  isOpen: boolean;
  /** Summary of saved session */
  summary: {
    currentWordIndex: number;
    totalWords: number;
    savedAt: number;
  } | null;
  /** Called when user wants to resume */
  onResume: () => void;
  /** Called when user wants to start fresh */
  onStartFresh: () => void;
  /** Called when prompt should close */
  onClose: () => void;
}

export function SavedSessionPrompt({
  isOpen,
  summary,
  onResume,
  onStartFresh,
  onClose,
}: SavedSessionPromptProps) {
  if (!isOpen || !summary) return null;

  const progress = summary.totalWords > 0
    ? Math.round((summary.currentWordIndex / summary.totalWords) * 100)
    : 0;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog saved-session-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Resume Reading?</h3>

        <p className="session-info">
          You have a saved session from <strong>{formatRelativeTime(summary.savedAt)}</strong>
        </p>

        <div className="session-stats">
          <div className="stat-row">
            <span className="stat-label">Progress</span>
            <span className="stat-value">{progress}%</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Position</span>
            <span className="stat-value">
              {summary.currentWordIndex} / {summary.totalWords} words
            </span>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn secondary" onClick={onStartFresh}>
            Start Fresh
          </button>
          <button className="btn primary" onClick={onResume}>
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}

export default SavedSessionPrompt;
