import { useState } from "react";
import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { Page, LoadingPanel, ErrorPanel, ProgressLine } from "../components/ui/index.jsx";

export default function Achievements() {
  const { loading, error, data } = useAsyncData(() => api("/api/achievements"), []);
  const [showUnlockToast, setShowUnlockToast] = useState(true);
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  const newlyUnlocked = showUnlockToast ? (data.newlyUnlocked || []) : [];

  return (
    <Page title="Achievements" subtitle="Badges earned from streaks, ranking, question solving, and review discipline.">
      {newlyUnlocked.length > 0 && (
        <div className="unlock-toast" role="status" aria-live="polite">
          <span className="stat-icon"><Icon name={newlyUnlocked[0].icon || "award"} /></span>
          <div>
            <p className="eyebrow">Achievement unlocked</p>
            <h2>{newlyUnlocked.length === 1 ? newlyUnlocked[0].title : `${newlyUnlocked.length} new badges`}</h2>
            <p>{newlyUnlocked.length === 1 ? newlyUnlocked[0].description : "Your progress unlocked fresh Dentify badges."}</p>
          </div>
          <button className="icon-btn" onClick={() => setShowUnlockToast(false)} aria-label="Dismiss achievement notification"><Icon name="x" size={17} /></button>
        </div>
      )}
      <section className="achievement-hero">
        <div>
          <p className="eyebrow">Badge Room</p>
          <h2>{data.summary.unlocked}/{data.summary.total} unlocked</h2>
          <p>Your Dentify badges now save from the backend.</p>
        </div>
        <div className="achievement-ring">{data.summary.completion}%</div>
      </section>
      <section className="achievement-grid">
        {data.achievements.map((achievement) => {
          const remaining = Math.max(0, Number(achievement.threshold || 0) - Number(achievement.value || 0));
          return (
            <article className={`achievement-card ${achievement.unlocked ? "unlocked" : "locked"}`} key={achievement.id}>
              <div className="achievement-card-head">
                <span className="stat-icon"><Icon name={achievement.icon} /></span>
                {!achievement.unlocked && <span className="lock-pill"><Icon name="lock" size={14} /> Locked</span>}
              </div>
              <div>
                <h2>{achievement.title}</h2>
                <p>{achievement.description}</p>
              </div>
              <ProgressLine value={achievement.progress} />
              <small>{achievement.unlocked ? "Unlocked" : `${remaining} more to unlock`} · {achievement.value}/{achievement.threshold}</small>
            </article>
          );
        })}
      </section>
    </Page>
  );
}
