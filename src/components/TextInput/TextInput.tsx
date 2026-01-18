import { useState, useRef, useCallback, ChangeEvent, FormEvent } from 'react';
import { getSupportedExtensions, validateFile } from '../../lib/file-parsers';
import './TextInput.css';

// Icons
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
  </svg>
);

export interface TextInputProps {
  /** Current text value */
  text: string;
  /** Whether file is being loaded */
  isLoading: boolean;
  /** Loading message to display */
  loadingMessage: string;
  /** Called when text is applied */
  onApply: (text: string) => void;
  /** Called when file is selected */
  onFileSelect: (file: File) => void;
  /** Called when panel should close */
  onClose: () => void;
}

export function TextInput({
  text: initialText,
  isLoading,
  loadingMessage,
  onApply,
  onFileSelect,
  onClose,
}: TextInputProps) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setError('');
  }, []);

  const handleApply = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed) {
        setError('Please enter some text');
        return;
      }
      onApply(trimmed);
      onClose();
    },
    [text, onApply, onClose]
  );

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      setError('');
      onFileSelect(file);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onFileSelect]
  );

  return (
    <div className="text-input-overlay" onClick={onClose}>
      <div className="text-input-panel" onClick={(e) => e.stopPropagation()}>
        <header className="text-input-header">
          <h2>Load Text</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="text-input-content">
          {/* File Upload Section */}
          <div className="upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept={getSupportedExtensions()}
              onChange={handleFileChange}
              hidden
            />
            <button
              className="upload-btn"
              onClick={handleFileClick}
              disabled={isLoading}
              type="button"
            >
              <UploadIcon />
              <span>Upload PDF or Text File</span>
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="loading-message">
              <div className="spinner" />
              <span>{loadingMessage || 'Loading...'}</span>
            </div>
          )}

          {/* Error Message */}
          {error && <p className="error-message">{error}</p>}

          {/* Divider */}
          <div className="divider">
            <span>or paste text</span>
          </div>

          {/* Text Input Form */}
          <form onSubmit={handleApply}>
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="Paste your text here..."
              rows={8}
              disabled={isLoading}
            />

            <div className="actions">
              <button type="button" className="btn secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={isLoading || !text.trim()}
              >
                Load Text
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TextInput;
