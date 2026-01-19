import './Quiz.css';

export interface MilestonePromptProps {
  milestonePercent: number;
  onGenerateQuiz: () => void;
  onDismiss: () => void;
}

export function MilestonePrompt({
  milestonePercent,
  onGenerateQuiz,
  onDismiss,
}: MilestonePromptProps) {
  return (
    <div className="milestone-prompt" role="alert">
      <div className="milestone-content">
        <span className="milestone-badge">{milestonePercent}%</span>
        <span className="milestone-text">Ready for a quiz?</span>
      </div>
      <div className="milestone-actions">
        <button className="btn primary small" onClick={onGenerateQuiz}>
          Generate Quiz
        </button>
        <button className="btn secondary small" onClick={onDismiss}>
          Later
        </button>
      </div>
    </div>
  );
}
