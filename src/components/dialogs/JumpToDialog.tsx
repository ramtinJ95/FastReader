import { useState, useCallback, KeyboardEvent, FormEvent } from 'react';
import './dialogs.css';

export interface JumpToDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Total word count (for percentage calculation) */
  totalWords: number;
  /** Called when dialog should close */
  onClose: () => void;
  /** Called when user confirms jump */
  onJump: (wordIndex: number) => void;
}

export function JumpToDialog({ isOpen, totalWords, onClose, onJump }: JumpToDialogProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      const trimmed = value.trim();
      if (!trimmed) {
        setError('Please enter a value');
        return;
      }

      let targetIndex: number;

      // Handle percentage input (e.g., "50%")
      if (trimmed.endsWith('%')) {
        const percent = parseFloat(trimmed.slice(0, -1));
        if (isNaN(percent) || percent < 0 || percent > 100) {
          setError('Enter a valid percentage (0-100%)');
          return;
        }
        targetIndex = Math.floor((percent / 100) * totalWords);
      } else {
        // Handle numeric input (word number)
        const num = parseInt(trimmed, 10);
        if (isNaN(num) || num < 0 || num > totalWords) {
          setError(`Enter a number between 0 and ${totalWords}`);
          return;
        }
        targetIndex = num;
      }

      onJump(targetIndex);
      setValue('');
      setError('');
      onClose();
    },
    [value, totalWords, onJump, onClose]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setValue('');
        setError('');
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog jump-to-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jump-to-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="jump-to-title">Jump to</h3>
        <form onSubmit={handleSubmit}>
          <label htmlFor="jump-to-input" className="visually-hidden">
            Jump to word number or percentage
          </label>
          <input
            id="jump-to-input"
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="Word # or %"
            autoFocus
            aria-describedby={error ? 'jump-to-error' : 'jump-to-hint'}
          />
          {error && <p id="jump-to-error" className="error" role="alert">{error}</p>}
          <p id="jump-to-hint" className="hint">
            Enter word number (0-{totalWords}) or percentage (e.g., 50%)
          </p>
          <div className="dialog-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              Jump
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default JumpToDialog;
