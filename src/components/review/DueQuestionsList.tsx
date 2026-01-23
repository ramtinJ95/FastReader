// Placeholder component - will be implemented in Task 2
interface Props {
  onStartReview: (documentId?: string) => void;
}

export default function DueQuestionsList({ onStartReview }: Props) {
  return (
    <div className="due-questions-list">
      <p>Due questions list - to be implemented</p>
    </div>
  );
}
