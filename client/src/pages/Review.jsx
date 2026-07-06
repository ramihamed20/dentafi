import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { relativeTime } from "../lib/utils.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { Page, LoadingPanel, ErrorPanel, ListRow, EmptyState, MiniFeature } from "../components/ui/index.jsx";

export default function Review() {
  const [refresh, setRefresh] = useState(0);
  const review = useAsyncData(() => api("/api/review"), [refresh]);
  const mistakes = useAsyncData(() => api("/api/advanced/mistakes"), []);
  if (review.loading || mistakes.loading) return <LoadingPanel />;
  if (review.error) return <ErrorPanel message={review.error} />;
  if (mistakes.error) return <ErrorPanel message={mistakes.error} />;
  const reviewItems = Array.isArray(review.data) ? review.data : review.data?.items || [];
  const reviewSummary = Array.isArray(review.data) ? { total: reviewItems.length, dueNow: 0, upcoming: reviewItems.length } : review.data?.summary || { total: 0, dueNow: 0, upcoming: 0 };
  const dueItems = reviewItems.filter((item) => item.dueNow);
  const upcomingItems = reviewItems.filter((item) => !item.dueNow);
  const activeReviewCount = reviewSummary.total;
  const availableMistakes = mistakes.data?.available || [];
  const lockedMistakes = mistakes.data?.locked || [];

  async function completeReviewItem(item) {
    await api(`/api/review/${item.id}/complete`, { method: "POST" });
    setRefresh((value) => value + 1);
  }

  function reviewAction(item) {
    return (
      <button className="icon-btn success" onClick={() => completeReviewItem(item)} aria-label={`Mark ${item.prompt || item.material_title || "review item"} reviewed`}>
        <Icon name="check" size={17} />
      </button>
    );
  }

  return (
    <Page title="Review Center" subtitle="Weak items, incorrect answers, and saved review targets.">
      <section className="review-hero">
        <div><p className="eyebrow">Spaced review</p><h2>{reviewSummary.dueNow} due now, {reviewSummary.upcoming} scheduled.</h2><p>{activeReviewCount} active review items are spaced by due time.</p></div>
        <span className="review-meter">{Math.max(20, 100 - activeReviewCount * 8)}%</span>
      </section>
      <section className="review-summary-grid">
        <MiniFeature title="Due now" text={`${reviewSummary.dueNow} items ready to review.`} icon="target" />
        <MiniFeature title="Upcoming" text={`${reviewSummary.upcoming} items scheduled soon.`} icon="clock" />
        <MiniFeature title="Mistake bank" text={`${availableMistakes.length} advanced mistakes available.`} icon="help" />
      </section>
      <section className="list-panel">
        <div className="panel-title"><h2>Due now</h2><span>{dueItems.length}</span></div>
        {dueItems.length ? dueItems.map((item) => <ListRow key={item.id} title={item.prompt || item.material_title || "Review item"} meta={`${item.reason} - due now`} icon="target" action={reviewAction(item)} />) : <EmptyState title="Nothing due right now" text="Wrong answers will appear here when their review time arrives." />}
      </section>
      <section className="list-panel">
        <div className="panel-title"><h2>Upcoming</h2><span>{upcomingItems.length}</span></div>
        {upcomingItems.length ? upcomingItems.map((item) => <ListRow key={item.id} title={item.prompt || item.material_title || "Review item"} meta={`${item.reason} - ${relativeTime(item.due_at)}`} icon="clock" action={reviewAction(item)} />) : <EmptyState title="No scheduled reviews" text="New weak answers will be scheduled automatically." />}
      </section>
      <section className="panel mistake-review">
        <div className="panel-title"><h2>Advanced Mistakes</h2><span>{availableMistakes.length}</span></div>
        {lockedMistakes.length > 0 && <p className="answer-note">{mistakes.data.message}</p>}
        {availableMistakes.length ? availableMistakes.map((item) => (
          <div className="mistake-row" key={item.id}>
            <span className="pill">{item.material_title} - {item.sheet_title} - Pages {item.page_range}</span>
            <h3>{item.question}</h3>
            <p>Your answer: <strong>{item.user_answer}</strong></p>
            <p>Correct answer: <strong>{item.correct_answer}</strong></p>
            <small>{item.explanation}</small>
          </div>
        )) : <p className="muted">No advanced mistakes are ready yet.</p>}
      </section>
    </Page>
  );
}
