import { useReviewStats } from '../../hooks/useReviewStats';

export default function ReviewStats() {
  const stats = useReviewStats();

  if (stats.isLoading) {
    return <div className="review-stats review-stats--loading">Loading stats...</div>;
  }

  if (stats.error) {
    return <div className="review-stats review-stats--error">Could not load statistics</div>;
  }

  const accuracyPercent = Math.round(stats.accuracyRate * 100);

  return (
    <div className="review-stats">
      <div className="review-stats__card">
        <span className="review-stats__value">{stats.totalQuestionsAnswered}</span>
        <span className="review-stats__label">Total Answered</span>
      </div>

      <div className="review-stats__card">
        <span className="review-stats__value">{accuracyPercent}%</span>
        <span className="review-stats__label">Accuracy</span>
      </div>

      <div className="review-stats__card">
        <span className="review-stats__value">{stats.questionsByState.review}</span>
        <span className="review-stats__label">Mastered</span>
      </div>

      <div className="review-stats__card">
        <span className="review-stats__value">
          {stats.questionsByState.learning + stats.questionsByState.relearning}
        </span>
        <span className="review-stats__label">Learning</span>
      </div>
    </div>
  );
}
