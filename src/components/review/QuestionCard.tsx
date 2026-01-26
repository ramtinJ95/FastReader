interface Question {
  questionText: string;
  questionType: string;
  options?: Record<string, string>;
  correctAnswer: string;
  rationale: string;
}

interface Props {
  question: Question;
  showAnswer: boolean;
  userAnswer: string | null;
  onAnswer: (answer: string) => void;
  onRating: (rating: 1 | 2 | 3 | 4) => void;
}

export default function QuestionCard({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  onRating,
}: Props) {
  const isCorrect = userAnswer === question.correctAnswer;

  if (showAnswer) {
    return (
      <div className="question-card question-card--feedback">
        <div
          className={`question-card__result ${isCorrect ? 'question-card__result--correct' : 'question-card__result--incorrect'}`}
        >
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </div>

        <p className="question-card__question">{question.questionText}</p>

        <p className="question-card__rationale">{question.rationale}</p>

        <div className="question-card__rating">
          <p>How difficult was this?</p>
          <div className="question-card__rating-buttons">
            <button onClick={() => onRating(1)}>Again</button>
            <button onClick={() => onRating(2)}>Hard</button>
            <button onClick={() => onRating(3)}>Good</button>
            <button onClick={() => onRating(4)}>Easy</button>
          </div>
        </div>
      </div>
    );
  }

  // Multiple choice display
  if (question.questionType === 'multiple_choice' && question.options) {
    return (
      <div className="question-card">
        <p className="question-card__question">{question.questionText}</p>

        <div className="question-card__options">
          {Object.entries(question.options).map(([key, value]) => (
            <button key={key} className="question-card__option" onClick={() => onAnswer(key)}>
              <span className="question-card__option-key">{key}</span>
              <span className="question-card__option-text">{value}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Short answer / fill-in-blank
  return (
    <div className="question-card">
      <p className="question-card__question">{question.questionText}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const input = form.elements.namedItem('answer') as HTMLInputElement;
          onAnswer(input.value);
        }}
      >
        <input
          type="text"
          name="answer"
          className="question-card__input"
          placeholder="Your answer..."
          autoFocus
        />
        <button type="submit" className="question-card__submit">
          Submit
        </button>
      </form>
    </div>
  );
}
