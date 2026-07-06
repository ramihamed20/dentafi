import { memo } from "react";
import { Icon } from "../../lib/icons.jsx";
import { correctEncouragement, explanationReviewTip } from "../../lib/utils.js";

export const QuestionCard = memo(function QuestionCard({ question, selected, feedback, onAnswer, onBookmark, hideBookmark = false }) {
  const answered = Boolean(selected);
  const encouragement = feedback?.isCorrect ? correctEncouragement(question.id) : "Added to your review rhythm.";
  return (
    <article className={`question-card ${feedback?.isCorrect ? "answered-correct" : feedback ? "answered-wrong" : ""}`}>
      <div className="card-head">
        <div><span className="pill">{question.materialTitle}</span><h2>{question.prompt}</h2></div>
        {!hideBookmark && <button className={`icon-btn ${question.bookmarked ? "active" : ""}`} onClick={() => onBookmark(question)} aria-label="Save question"><Icon name="bookmark" /></button>}
      </div>
      <div className="choices">
        {question.choices.map((choice, index) => {
          const state = feedback && choice === feedback.correctChoice ? "correct" : feedback && choice === selected ? "wrong" : selected === choice ? "selected" : "";
          return (
            <button key={choice} className={state} onClick={() => onAnswer(question, choice)} disabled={answered} aria-pressed={selected === choice}>
              <span className="choice-prefix">{String.fromCharCode(65 + index)}</span>
              <span>{choice}</span>
              {feedback && choice === feedback.correctChoice && <Icon name="check" size={18} />}
            </button>
          );
        })}
      </div>
      {feedback && (
        <div className={`answer-note ${feedback.isCorrect ? "correct" : "wrong"}`} role="status">
          <div className="answer-note-head">
            <strong>{feedback.isCorrect ? encouragement : "Review this one"}</strong>
            <span className="xp-chip">+{feedback.xpAwarded || 0} XP</span>
          </div>
          <ExplanationCard question={question} feedback={feedback} selected={selected} />
          {feedback.reviewScheduled && <small>Scheduled for spaced review.</small>}
        </div>
      )}
    </article>
  );
});

export const ExplanationCard = memo(function ExplanationCard({ question, feedback, selected }) {
  const keyIdea = feedback.isCorrect
    ? `${feedback.correctChoice} is the recall anchor for this question.`
    : `Compare ${selected} with ${feedback.correctChoice} before moving on.`;
  const reviewTip = explanationReviewTip(question, feedback);
  return (
    <details className="explanation-card" open={!feedback.isCorrect}>
      <summary>
        <span>Why this answer?</span>
        <Icon name="chevron-right" size={16} />
      </summary>
      <div className="explanation-grid">
        <div>
          <small>Key idea</small>
          <p>{keyIdea}</p>
        </div>
        <div>
          <small>Explanation</small>
          <p>{feedback.explanation}</p>
        </div>
        <div>
          <small>Review tip</small>
          <p>{reviewTip}</p>
        </div>
      </div>
    </details>
  );
});

