import './Quiz.css';

export interface GeneratingOverlayProps {
  onCancel?: () => void;
}

export function GeneratingOverlay({ onCancel }: GeneratingOverlayProps) {
  return (
    <div className="dialog-overlay">
      <div className="dialog generating-overlay" role="alert" aria-live="polite">
        <div className="generating-spinner" aria-hidden="true" />
        <h3>Generating Questions</h3>
        <p>Using AI to create comprehension questions...</p>
        <p className="generating-hint">This may take 30-60 seconds.</p>
        {onCancel && (
          <button className="btn secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
