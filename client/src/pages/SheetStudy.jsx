import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { Page, LoadingPanel, ErrorPanel, ProgressLine, BreadcrumbBar } from "../components/ui/index.jsx";

export default function SheetStudy() {
  const { materialId, sheetId } = useParams();
  const [session, setSession] = useState(null);
  const [modeStep, setModeStep] = useState("choose");
  const [difficulty, setDifficulty] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [variant, setVariant] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startNormal() {
    await runAction(async () => {
      const data = await api(`/api/sheets/${sheetId}/start`, { method: "POST", body: JSON.stringify({ mode: "normal" }) });
      setSession(data);
      setModeStep("reader");
    });
  }

  async function startAdvanced(nextDifficulty) {
    await runAction(async () => {
      const data = await api(`/api/sheets/${sheetId}/start`, {
        method: "POST",
        body: JSON.stringify({ mode: "advanced", difficulty: nextDifficulty })
      });
      setDifficulty(nextDifficulty);
      setSession(data);
      setModeStep("advanced");
      setQuiz(null);
      setResult(null);
      setAnswers({});
    });
  }

  async function loadQuiz(isFinal = false, nextVariant = variant) {
    await runAction(async () => {
      const block = session.block || { pageStart: 1, pageEnd: session.sheet.totalPages };
      const data = await api(
        `/api/sheets/${sheetId}/quiz?difficulty=${difficulty}&pageStart=${block.pageStart}&pageEnd=${block.pageEnd}&variant=${nextVariant}${isFinal ? "&final=1" : ""}`
      );
      setQuiz(data);
      setResult(null);
      setAnswers({});
    });
  }

  async function submitQuiz() {
    await runAction(async () => {
      const data = await api(`/api/sheets/${sheetId}/quiz/submit`, {
        method: "POST",
        body: JSON.stringify({
          difficulty,
          pageStart: quiz.pageStart,
          pageEnd: quiz.pageEnd,
          isFinal: quiz.isFinal,
          variant: quiz.variant,
          answers: quiz.questions.map((question) => ({
            questionId: question.id,
            selectedAnswer: answers[question.id] || ""
          }))
        })
      });
      setResult(data);
      setQuiz(null);
    });
  }

  async function continueAfterReview() {
    await runAction(async () => {
      const data = await api(`/api/sheets/${sheetId}/advanced/continue`, {
        method: "POST",
        body: JSON.stringify({ difficulty, pageEnd: result.pageEnd })
      });
      setSession(data);
      setResult(null);
      setQuiz(null);
      setAnswers({});
    });
  }

  function retakeQuiz() {
    const nextVariant = variant + 1;
    setVariant(nextVariant);
    loadQuiz(result?.isFinal || false, nextVariant);
  }

  async function runAction(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (modeStep === "choose") {
    return (
      <Page title="Study Mode" subtitle="Select how you want to open this sheet. Advanced Study unlocks only 3 pages at a time.">
        <BreadcrumbBar items={[["Materials", "/materials"], ["Sheets", `/materials/${materialId}`]]} current="Study mode" />
        <section className="study-mode-grid">
          <button className="study-mode-card" onClick={startNormal} disabled={busy}>
            <span className="stat-icon"><Icon name="book-open" /></span>
            <h2>Normal Study</h2>
            <p>Open the full sheet normally with no restrictions.</p>
          </button>
          <button className="study-mode-card featured" onClick={() => setModeStep("difficulty")} disabled={busy}>
            <span className="stat-icon"><Icon name="target" /></span>
            <h2>Advanced Study</h2>
            <p>Study 3 pages, pass a quiz, unlock the next 3 pages, and collect XP.</p>
          </button>
        </section>
        {error && <ErrorPanel message={error} />}
      </Page>
    );
  }

  if (modeStep === "difficulty") {
    return (
      <Page title="Advanced Study" subtitle="Choose the difficulty for this sheet. The Final Boss will use the same difficulty.">
        <BreadcrumbBar items={[["Materials", "/materials"], ["Sheets", `/materials/${materialId}`], ["Study mode", `/materials/${materialId}/sheets/${sheetId}`]]} current="Advanced" />
        <section className="difficulty-grid">
          {["easy", "medium", "hard"].map((level) => (
            <button className={`difficulty-card ${level}`} key={level} onClick={() => startAdvanced(level)} disabled={busy}>
              <span>{level}</span>
              <h2>{level === "easy" ? "5 questions" : level === "medium" ? "7 questions" : "10 questions"}</h2>
              <p>{level === "easy" ? "+10 XP per correct answer" : level === "medium" ? "+15 XP per correct answer" : "+25 XP per correct answer"}</p>
            </button>
          ))}
        </section>
        {error && <ErrorPanel message={error} />}
      </Page>
    );
  }

  return (
    <Page title={session?.sheet?.title || "Sheet"} subtitle={session?.mode === "normal" ? "Normal Study mode" : "Advanced Study mode"}>
      <BreadcrumbBar items={[["Materials", "/materials"], ["Sheets", `/materials/${materialId}`], ["Study mode", `/materials/${materialId}/sheets/${sheetId}`]]} current={session?.sheet?.title || "Sheet"} />
      {error && <ErrorPanel message={error} />}
      {session?.mode === "normal" && <SheetReader session={session} />}
      {session?.mode === "advanced" && (
        <>
          <AdvancedStudyPanel session={session} onQuiz={() => loadQuiz(false)} onFinal={() => loadQuiz(true)} busy={busy} />
          {quiz && <QuizPanel quiz={quiz} answers={answers} setAnswers={setAnswers} onSubmit={submitQuiz} busy={busy} />}
          {result && (
            <QuizResultPanel
              result={result}
              onNext={() => startAdvanced(difficulty)}
              onContinue={continueAfterReview}
              onRetake={retakeQuiz}
              busy={busy}
            />
          )}
        </>
      )}
      <div className="study-footer-actions">
        <Link className="btn btn-soft" to={`/materials/${materialId}`}>Back to sheets</Link>
      </div>
    </Page>
  );
}

function SheetReader({ session }) {
  return (
    <section className="sheet-reader">
      {session.pages.map((page) => <SheetPage key={page.page} page={page} />)}
    </section>
  );
}

function AdvancedStudyPanel({ session, onQuiz, onFinal, busy }) {
  const { progress, block } = session;
  return (
    <section className="advanced-layout">
      <article className="advanced-status">
        <div>
          <p className="eyebrow">{session.difficulty} mode</p>
          <h2>Pages {block.pageStart}-{block.pageEnd}</h2>
          <p>Only 3 pages are unlocked. Finish this block, then take the checkpoint quiz.</p>
        </div>
        <div className="xp-card"><span>XP</span><strong>{progress.xp}</strong></div>
        <div className="advanced-progress">
          <span>{progress.masteryStatus}</span>
          <ProgressLine value={Math.round((progress.unlockedPages / progress.totalPages) * 100)} />
          <small>{progress.unlockedPages}/{progress.totalPages} pages unlocked</small>
        </div>
      </article>
      <section className="sheet-reader compact">
        {session.pages.map((page) => <SheetPage key={page.page} page={page} />)}
      </section>
      <article className="advanced-actions">
        {session.weakPoints.length > 0 && (
          <div className="needs-review-list">
            <h2>Needs Review</h2>
            {session.weakPoints.map((item) => <span key={item.topic}>{item.topic} ({item.wrongCount})</span>)}
          </div>
        )}
        {session.finalAvailable ? (
          <button className="btn btn-primary" onClick={onFinal} disabled={busy}>Start Final Boss Quiz</button>
        ) : (
          <button className="btn btn-primary" onClick={onQuiz} disabled={busy || !session.quizRequired}>Take checkpoint quiz</button>
        )}
      </article>
    </section>
  );
}

function SheetPage({ page }) {
  return (
    <article className="sheet-page">
      <span className="pill">Page {page.page}</span>
      <h2>{page.title}</h2>
      {page.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </article>
  );
}

function QuizPanel({ quiz, answers, setAnswers, onSubmit, busy }) {
  const answered = quiz.questions.filter((question) => answers[question.id]).length;
  return (
    <section className="quiz-panel">
      <div className="panel-title"><h2>{quiz.isFinal ? "Final Boss Quiz" : "Checkpoint Quiz"}</h2><span>{answered}/{quiz.questions.length}</span></div>
      {quiz.questions.map((question) => (
        <article className="quiz-question" key={question.id}>
          <span className="pill">{question.type.replace("_", " ")} - Page {question.page}</span>
          <h3>{question.prompt}</h3>
          <div className="choices">
            {question.choices.map((choice, index) => (
              <button
                key={choice}
                className={answers[question.id] === choice ? "selected" : ""}
                onClick={() => setAnswers((current) => ({ ...current, [question.id]: choice }))}
                aria-pressed={answers[question.id] === choice}
              >
                <span className="choice-prefix">{String.fromCharCode(65 + index)}</span>
                <span>{choice}</span>
              </button>
            ))}
          </div>
        </article>
      ))}
      <button className="btn btn-primary" onClick={onSubmit} disabled={busy || answered !== quiz.questions.length}>Submit quiz</button>
    </section>
  );
}

function QuizResultPanel({ result, onNext, onContinue, onRetake, busy }) {
  return (
    <section className="quiz-result">
      <article className="result-hero">
        <div><p className="eyebrow">Score</p><h2>{result.score}%</h2><p>{result.message}</p></div>
        <div className="xp-card"><span>XP earned</span><strong>{result.xpAwarded}</strong></div>
      </article>
      {result.weakPoints.length > 0 && (
        <article className="panel needs-review-list">
          <h2>Needs Review</h2>
          {result.weakPoints.map((topic) => <span key={topic}>{topic}</span>)}
        </article>
      )}
      <article className="panel mistake-review">
        <div className="panel-title"><h2>Review My Mistakes</h2><span>{result.wrongItems.length}</span></div>
        {result.wrongItems.length ? result.wrongItems.map((item) => (
          <div className="mistake-row" key={item.questionId}>
            <h3>{item.question}</h3>
            <p>Your answer: <strong>{item.userAnswer}</strong></p>
            <p>Correct answer: <strong>{item.correctAnswer}</strong></p>
            <small>{item.explanation}</small>
          </div>
        )) : <p className="muted">No mistakes in this quiz.</p>}
      </article>
      <div className="result-actions">
        {result.unlockedNext && <button className="btn btn-primary" onClick={onNext} disabled={busy}>Open next 3 pages</button>}
        {result.canContinue && <button className="btn btn-primary" onClick={onContinue} disabled={busy}>Continue to next 3 pages</button>}
        {(result.canContinue || result.mustRetake || result.isFinal) && <button className="btn btn-soft" onClick={onRetake} disabled={busy}>Retake with new placeholders</button>}
      </div>
    </section>
  );
}
