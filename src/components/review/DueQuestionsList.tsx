import { useDueQuestions } from '../../hooks/useDueQuestions';

interface Props {
  onStartReview: (documentId?: string) => void;
}

export default function DueQuestionsList({ onStartReview }: Props) {
  const { totalDue, totalQuestions, byDocument, isLoading, error, refresh } = useDueQuestions();

  if (isLoading) {
    return <div className="due-questions-list due-questions-list--loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="due-questions-list due-questions-list--error">
        <p>Error: {error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  if (totalDue === 0) {
    // Distinguish between "no questions exist" vs "all reviews completed"
    const hasQuestionsInQueue = totalQuestions > 0;

    return (
      <div className="due-questions-list due-questions-list--empty">
        {hasQuestionsInQueue ? (
          <>
            <p>All caught up!</p>
            <p className="due-questions-list__hint">
              You have reviewed all due questions. Check back later for more.
            </p>
          </>
        ) : (
          <>
            <p>No questions due for review.</p>
            <p className="due-questions-list__hint">
              Complete quizzes while reading to build your review queue.
            </p>
          </>
        )}
      </div>
    );
  }

  const documentEntries = Array.from(byDocument.entries());

  return (
    <div className="due-questions-list">
      <div className="due-questions-list__header">
        <h2>{totalDue} questions due</h2>
        <button className="due-questions-list__review-all" onClick={() => onStartReview()}>
          Review All
        </button>
      </div>

      <ul className="due-questions-list__documents">
        {documentEntries.map(([docId, { title, count }]) => (
          <li key={docId} className="due-questions-list__document">
            <div className="due-questions-list__document-info">
              <span className="due-questions-list__document-title">{title}</span>
              <span className="due-questions-list__document-count">{count} due</span>
            </div>
            <button
              className="due-questions-list__document-review"
              onClick={() => onStartReview(docId)}
            >
              Review
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
