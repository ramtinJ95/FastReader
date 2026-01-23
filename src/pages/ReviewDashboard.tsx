import { useState } from 'react';
import DueQuestionsList from '../components/review/DueQuestionsList';
import ReviewStats from '../components/review/ReviewStats';
import ReviewSession from '../components/review/ReviewSession';

type ViewMode = 'dashboard' | 'session';

export default function ReviewDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const startReview = (documentId?: string) => {
    setSelectedDocumentId(documentId || null);
    setViewMode('session');
  };

  const endReview = () => {
    setViewMode('dashboard');
    setSelectedDocumentId(null);
  };

  if (viewMode === 'session') {
    return (
      <ReviewSession documentId={selectedDocumentId} onComplete={endReview} onCancel={endReview} />
    );
  }

  return (
    <div className="review-dashboard">
      <header className="review-dashboard__header">
        <h1>Review</h1>
      </header>

      <div className="review-dashboard__content">
        <ReviewStats />
        <DueQuestionsList onStartReview={startReview} />
      </div>
    </div>
  );
}
