interface Props {
  correct: number;
  total: number;
  onDone: () => void;
}

export default function ReviewComplete({ correct, total, onDone }: Props) {
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="review-complete">
      <h2>Review Complete</h2>

      <div className="review-complete__score">
        <span className="review-complete__correct">{correct}</span>
        <span className="review-complete__separator">/</span>
        <span className="review-complete__total">{total}</span>
      </div>

      <p className="review-complete__percentage">{percentage}% correct</p>

      <button className="review-complete__done" onClick={onDone}>
        Back to Dashboard
      </button>
    </div>
  );
}
