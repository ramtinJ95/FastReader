// Placeholder component - will be implemented in Task 4
interface Props {
  documentId: string | null;
  onComplete: () => void;
  onCancel: () => void;
}

export default function ReviewSession({ documentId, onComplete, onCancel }: Props) {
  return (
    <div className="review-session">
      <p>Review session - to be implemented</p>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}
