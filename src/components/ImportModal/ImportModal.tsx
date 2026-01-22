import { useState, useRef, useCallback, ChangeEvent } from 'react';
import {
  extractFromUrl,
  extractFromTextFile,
  importDocument,
  createPasteExtract,
  type ImportResult,
} from '../../services/importService';
import './ImportModal.css';

// Icons
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
  </svg>
);

const TextIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  </svg>
);

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
}

type ImportTab = 'url' | 'file' | 'paste';

export function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>('url');
  const [url, setUrl] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setUrl('');
    setPasteContent('');
    setPasteTitle('');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleUrlImport = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const extraction = await extractFromUrl(trimmedUrl);
      const result = await importDocument(extraction);
      onImportComplete(result);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import from URL');
    } finally {
      setIsLoading(false);
    }
  }, [url, onImportComplete, handleClose]);

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['txt', 'md', 'markdown'].includes(ext || '')) {
        setError('Please select a .txt or .md file');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const extraction = await extractFromTextFile(file);
        const result = await importDocument(extraction);
        onImportComplete(result);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import file');
      } finally {
        setIsLoading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onImportComplete, handleClose]
  );

  const handlePasteImport = useCallback(async () => {
    const trimmedContent = pasteContent.trim();
    if (!trimmedContent) {
      setError('Please enter some content');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const extraction = createPasteExtract(trimmedContent, pasteTitle);
      const result = await importDocument(extraction);
      onImportComplete(result);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import content');
    } finally {
      setIsLoading(false);
    }
  }, [pasteContent, pasteTitle, onImportComplete, handleClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose]
  );

  if (!isOpen) return null;

  return (
    <div className="import-modal-overlay" onClick={handleClose} onKeyDown={handleKeyDown}>
      <div
        className="import-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="import-modal-header">
          <h2 id="import-modal-title">Import Document</h2>
          <button className="close-btn" onClick={handleClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="import-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'url'}
            aria-controls="tab-panel-url"
            className={`import-tab ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('url');
              setError(null);
            }}
          >
            <LinkIcon />
            <span>From URL</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'file'}
            aria-controls="tab-panel-file"
            className={`import-tab ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('file');
              setError(null);
            }}
          >
            <UploadIcon />
            <span>From File</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'paste'}
            aria-controls="tab-panel-paste"
            className={`import-tab ${activeTab === 'paste' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('paste');
              setError(null);
            }}
          >
            <TextIcon />
            <span>Paste Text</span>
          </button>
        </div>

        <div className="import-content">
          {activeTab === 'url' && (
            <div id="tab-panel-url" role="tabpanel" className="import-panel">
              <label htmlFor="url-input">Article URL</label>
              <input
                id="url-input"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              <p className="import-note">
                Note: Due to browser security restrictions (CORS), some websites may not be
                accessible. For better extraction, use the{' '}
                <code>fastreader-extract</code> CLI tool.
              </p>
              <button
                className="btn primary import-btn"
                onClick={handleUrlImport}
                disabled={isLoading || !url.trim()}
              >
                {isLoading ? 'Importing...' : 'Import'}
              </button>
            </div>
          )}

          {activeTab === 'file' && (
            <div id="tab-panel-file" role="tabpanel" className="import-panel">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown"
                onChange={handleFileChange}
                hidden
              />
              <button
                className="upload-area"
                onClick={handleFileClick}
                disabled={isLoading}
                type="button"
              >
                <UploadIcon />
                <span>Select a text file (.txt, .md)</span>
              </button>
              <p className="import-note">
                For PDF files, use the <code>fastreader-extract</code> CLI tool to extract text
                first.
              </p>
            </div>
          )}

          {activeTab === 'paste' && (
            <div id="tab-panel-paste" role="tabpanel" className="import-panel">
              <label htmlFor="paste-title-input">Title (optional)</label>
              <input
                id="paste-title-input"
                type="text"
                placeholder="Document title"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                disabled={isLoading}
              />
              <label htmlFor="paste-content-input">Content</label>
              <textarea
                id="paste-content-input"
                placeholder="Paste your text here..."
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                disabled={isLoading}
                rows={8}
              />
              <button
                className="btn primary import-btn"
                onClick={handlePasteImport}
                disabled={isLoading || !pasteContent.trim()}
              >
                {isLoading ? 'Importing...' : 'Import'}
              </button>
            </div>
          )}

          {isLoading && (
            <div className="loading-indicator">
              <div className="spinner" />
              <span>Importing...</span>
            </div>
          )}

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportModal;
