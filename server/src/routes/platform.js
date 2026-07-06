import { Router } from "express";
import { db, getUserThemeSettings, saveUserThemeSettings } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import {
  buildPlaceholderQuiz,
  buildSheetPages,
  getMasteryStatus,
  getPageBlock,
  normalizeDifficulty,
  resultMessage,
  scoreQuiz
} from "../lib/advancedStudy.js";
import { getMaterialProgress, getUserStats, getWeeklyChallenge } from "../lib/stats.js";

export const platformRouter = Router();
platformRouter.use(requireAuth);

platformRouter.get("/dashboard", (req, res) => {
  const stats = getUserStats(req.user.id);
  const materials = getMaterialProgress(req.user.id);
  const plan = db
    .prepare("SELECT id, time, topic FROM study_plan_items WHERE user_id = ? ORDER BY time")
    .all(req.user.id);
  const review = db
    .prepare("SELECT id, type, target_id, reason, due_at FROM review_items WHERE user_id = ? AND completed_at IS NULL ORDER BY due_at LIMIT 4")
    .all(req.user.id);

  return res.json({
    data: {
      user: req.user,
      stats,
      nextMaterial: materials.find((item) => item.progress < 100) || materials[0],
      materials: materials.slice(0, 4),
      studyPlan: plan,
      review,
      insight: buildDashboardInsight(stats, materials, review),
      weeklyChallenge: getWeeklyChallenge(req.user.id)
    }
  });
});

function buildDashboardInsight(stats, materials, reviewItems) {
  const nextMaterial = materials.find((item) => item.progress < 100) || materials[0];
  const strongestMaterial = [...materials].sort((a, b) => b.accuracy - a.accuracy || b.progress - a.progress)[0];
  const dailyRemaining = stats.dailyGoal?.remaining || 0;

  if (stats.dueReviewCount > 0) {
    return {
      title: "Review waiting",
      body: `${stats.dueReviewCount} review ${stats.dueReviewCount === 1 ? "item is" : "items are"} due. Clear them before starting new questions.`,
      tone: "review",
      actionLabel: "Open review",
      actionPath: "/review"
    };
  }

  if (dailyRemaining > 0) {
    return {
      title: "Today's focus",
      body: `${dailyRemaining} questions left to finish your daily goal. Start with ${nextMaterial?.title || "your next material"}.`,
      tone: "goal",
      actionLabel: "Practice now",
      actionPath: nextMaterial?.id ? `/questions?materialId=${nextMaterial.id}` : "/questions"
    };
  }

  if (stats.accuracy >= 80 && strongestMaterial) {
    return {
      title: "Strong signal",
      body: `${strongestMaterial.title} is looking steady at ${strongestMaterial.accuracy}% accuracy. Keep the recall warm.`,
      tone: "success",
      actionLabel: "View progress",
      actionPath: "/progress"
    };
  }

  return {
    title: "Build momentum",
    body: "One focused block today makes tomorrow's dentistry revision calmer.",
    tone: reviewItems.length ? "review" : "goal",
    actionLabel: "Continue studying",
    actionPath: "/materials"
  };
}

function parseStudyPlanPayload(body = {}) {
  const time = typeof body.time === "string" ? body.time.trim() : "";
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !topic) {
    return { error: "A valid study time and topic are required." };
  }
  return { time, topic };
}

platformRouter.get("/community", (req, res) => {
  const stats = getUserStats(req.user.id);
  const materials = getMaterialProgress(req.user.id);
  const announcements = db
    .prepare("SELECT id, title, body, tone, created_at AS createdAt FROM announcements ORDER BY id DESC LIMIT 8")
    .all();
  const posts = db
    .prepare(`
      SELECT
        p.id,
        p.body,
        p.tag,
        p.likes,
        p.replies,
        p.created_at AS createdAt,
        u.name AS author,
        u.year AS year
      FROM community_posts p
      JOIN users u ON u.id = p.user_id
      ORDER BY datetime(p.created_at) DESC, p.id DESC
      LIMIT 24
    `)
    .all();
  const buddyCandidate = db
    .prepare("SELECT name, label, metric, points, accuracy FROM leaderboard_entries WHERE scope = 'weekly' ORDER BY rank_order LIMIT 1 OFFSET 1")
    .get();
  const focusMaterial = materials.find((item) => item.progress < 100) || materials[0];
  const buddy = {
    name: buddyCandidate?.name || "Dentify Partner",
    label: buddyCandidate?.label || "Study Buddy",
    metric: buddyCandidate?.metric || "Ready to review",
    accuracy: buddyCandidate?.accuracy || Math.max(stats.accuracy, 80),
    sharedGoal: `Solve 10 ${focusMaterial?.title || "dentistry"} questions together today.`,
    userSignal: `${stats.dailyGoal.remaining} left for your daily goal`
  };

  return res.json({ data: { announcements, posts, buddy } });
});

platformRouter.post("/community/posts", (req, res) => {
  const body = String(req.body?.body || "").trim();
  const tag = String(req.body?.tag || "Question").trim().slice(0, 24) || "Question";
  if (body.length < 4) return res.status(400).json({ error: "Post body is too short" });
  if (body.length > 420) return res.status(400).json({ error: "Post body must be under 420 characters" });

  const result = db
    .prepare("INSERT INTO community_posts (user_id, body, tag) VALUES (?, ?, ?)")
    .run(req.user.id, body, tag);
  const post = db
    .prepare(`
      SELECT
        p.id,
        p.body,
        p.tag,
        p.likes,
        p.replies,
        p.created_at AS createdAt,
        u.name AS author,
        u.year AS year
      FROM community_posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = ?
    `)
    .get(result.lastInsertRowid);

  return res.status(201).json({ data: post });
});

platformRouter.delete("/community/posts/:id", (req, res) => {
  db.prepare("DELETE FROM community_posts WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  return res.json({ data: { ok: true } });
});

platformRouter.get("/ranked", (req, res) => {
  const entries = db
    .prepare(`
      SELECT scope, name, label, metric, points, accuracy, rank_order AS rank
      FROM leaderboard_entries
      ORDER BY scope, rank_order
    `)
    .all();
  const groups = entries.reduce((collection, entry) => {
    collection[entry.scope] = collection[entry.scope] || [];
    collection[entry.scope].push(entry);
    return collection;
  }, {});
  const stats = getUserStats(req.user.id);
  const userPoints = Math.max(
    3680,
    stats.questionsSolved * 75 + stats.correctAnswers * 30 + stats.studyHours * 40 + stats.savedItems * 25
  );

  return res.json({
    data: {
      featured: groups.weekly?.[0] || null,
      monthlyChampion: groups.monthly?.[0] || null,
      groups,
      currentUser: {
        name: req.user.name,
        rank: 12,
        percentile: "Top 12%",
        points: userPoints,
        accuracy: Math.max(stats.accuracy, 84)
      }
    }
  });
});

platformRouter.get("/achievements", (req, res) => {
  const stats = getUserStats(req.user.id);
  const values = {
    ...stats,
    streakDays: 14,
    rankedPoints: Math.max(
      3680,
      stats.questionsSolved * 75 + stats.correctAnswers * 30 + stats.studyHours * 40 + stats.savedItems * 25
    )
  };
  const rows = db
    .prepare("SELECT id, title, description, icon, metric, threshold FROM achievements ORDER BY order_index")
    .all();
  const previouslyUnlocked = new Set(
    db
      .prepare("SELECT achievement_id FROM user_achievements WHERE user_id = ?")
      .all(req.user.id)
      .map((row) => row.achievement_id)
  );
  const unlockStmt = db.prepare("INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)");
  const newlyUnlocked = [];
  const achievements = rows.map((row) => {
    const value = Number(values[row.metric] || 0);
    const unlocked = value >= row.threshold;
    if (unlocked) {
      unlockStmt.run(req.user.id, row.id);
      if (!previouslyUnlocked.has(row.id)) {
        newlyUnlocked.push({
          id: row.id,
          title: row.title,
          description: row.description,
          icon: row.icon
        });
      }
    }
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      icon: row.icon,
      metric: row.metric,
      threshold: row.threshold,
      value,
      progress: Math.min(100, Math.round((value / Math.max(row.threshold, 1)) * 100)),
      unlocked
    };
  });
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  return res.json({
    data: {
      summary: {
        unlocked: unlockedCount,
        total: achievements.length,
        completion: achievements.length ? Math.round((unlockedCount / achievements.length) * 100) : 0
      },
      newlyUnlocked,
      achievements
    }
  });
});

platformRouter.get("/settings/theme", (req, res) => {
  return res.json({ data: getUserThemeSettings(req.user.id) });
});

platformRouter.put("/settings/theme", (req, res) => {
  const character = String(req.body?.character || "").toLowerCase();
  const theme = String(req.body?.theme || "").toLowerCase();
  const autoTheme = Boolean(req.body?.autoTheme);
  if (!["black", "white"].includes(character)) {
    return res.status(400).json({ error: "Character must be black or white." });
  }
  if (!["dawn", "day", "sunset", "night"].includes(theme)) {
    return res.status(400).json({ error: "Theme must be dawn, day, sunset, or night." });
  }
  return res.json({ data: saveUserThemeSettings(req.user.id, { character, theme, autoTheme }) });
});

platformRouter.get("/materials", (req, res) => {
  return res.json({ data: getMaterialProgress(req.user.id) });
});

platformRouter.get("/materials/:materialId/sheets", (req, res) => {
  const materialId = Number(req.params.materialId);
  const material = db.prepare("SELECT * FROM materials WHERE id = ?").get(materialId);
  if (!material) return res.status(404).json({ error: "Material not found" });
  const sheets = db
    .prepare(`
      SELECT
        s.id,
        s.material_id AS materialId,
        s.sheet_number AS sheetNumber,
        s.title,
        s.total_pages AS totalPages,
        s.summary,
        COALESCE(MAX(p.average_score), 0) AS bestAverage,
        COALESCE(MAX(CASE WHEN p.mastery_status = 'Mastered' THEN 1 ELSE 0 END), 0) AS mastered
      FROM material_sheets s
      LEFT JOIN advanced_sheet_progress p ON p.sheet_id = s.id AND p.user_id = ?
      WHERE s.material_id = ?
      GROUP BY s.id
      ORDER BY s.order_index
    `)
    .all(req.user.id, materialId)
    .map((sheet) => ({
      ...sheet,
      mastered: Boolean(sheet.mastered),
      masteryStatus: sheet.mastered ? "Mastered" : getMasteryStatus(sheet.bestAverage)
    }));

  return res.json({
    data: {
      material: {
        id: material.id,
        title: material.title,
        slug: material.slug,
        description: material.description,
        icon: material.icon
      },
      sheets
    }
  });
});

platformRouter.post("/sheets/:id/start", (req, res) => {
  const sheet = getSheet(req.params.id);
  if (!sheet) return res.status(404).json({ error: "Sheet not found" });
  const mode = String(req.body?.mode || "normal").toLowerCase();
  if (mode === "normal") {
    return res.json({ data: { mode: "normal", sheet: toSheetPayload(sheet), pages: buildSheetPages(sheet) } });
  }

  const difficulty = normalizeDifficulty(req.body?.difficulty);
  const progress = getOrCreateProgress(req.user.id, sheet.id, difficulty);
  return res.json({ data: buildAdvancedSession(req.user.id, sheet, progress) });
});

platformRouter.get("/sheets/:id/quiz", (req, res) => {
  const sheet = getSheet(req.params.id);
  if (!sheet) return res.status(404).json({ error: "Sheet not found" });
  const difficulty = normalizeDifficulty(req.query.difficulty);
  const progress = getOrCreateProgress(req.user.id, sheet.id, difficulty);
  const isFinal = String(req.query.final || "0") === "1";
  if (isFinal && progress.last_quizzed_page < sheet.total_pages) {
    return res.status(400).json({ error: "Final Boss unlocks after all page blocks are quizzed." });
  }
  const currentBlock = getPageBlock(progress.unlocked_pages, sheet.total_pages);
  const block = isFinal
    ? { pageStart: 1, pageEnd: sheet.total_pages }
    : currentBlock;
  const variant = Number(req.query.variant || 0);
  const questions = buildPlaceholderQuiz({ sheet, difficulty, ...block, variant, isFinal }).map(({ correctAnswer, ...question }) => question);
  return res.json({ data: { sheet: toSheetPayload(sheet), difficulty, isFinal, variant, ...block, questions } });
});

platformRouter.post("/sheets/:id/quiz/submit", (req, res) => {
  const sheet = getSheet(req.params.id);
  if (!sheet) return res.status(404).json({ error: "Sheet not found" });
  const difficulty = normalizeDifficulty(req.body?.difficulty);
  const isFinal = Boolean(req.body?.isFinal);
  const variant = Number(req.body?.variant || 0);
  const progress = getOrCreateProgress(req.user.id, sheet.id, difficulty);
  const block = isFinal
    ? { pageStart: 1, pageEnd: sheet.total_pages }
    : getPageBlock(progress.unlocked_pages, sheet.total_pages);
  if (isFinal && progress.last_quizzed_page < sheet.total_pages) {
    return res.status(400).json({ error: "Final Boss unlocks after all page blocks are quizzed." });
  }

  const questions = buildPlaceholderQuiz({ sheet, difficulty, ...block, variant, isFinal });
  const result = scoreQuiz({ questions, answers: req.body?.answers || [], difficulty });
  saveAdvancedQuizResult(req.user.id, sheet, difficulty, block, isFinal, result);
  saveAdvancedMistakes(req.user.id, sheet, difficulty, block, result.wrongItems);

  const nextProgress = updateAdvancedProgress(req.user.id, sheet, progress, difficulty, block, isFinal, result);
  return res.json({
    data: {
      ...result,
      message: resultMessage(result.score, isFinal),
      isFinal,
      difficulty,
      pageStart: block.pageStart,
      pageEnd: block.pageEnd,
      canContinue: !isFinal && result.score >= 50 && result.score < 70,
      mustRetake: !isFinal && result.score < 50,
      unlockedNext: !isFinal && result.score >= 70,
      masteryStatus: nextProgress.mastery_status,
      progress: progressPayload(nextProgress, sheet)
    }
  });
});

platformRouter.post("/sheets/:id/advanced/continue", (req, res) => {
  const sheet = getSheet(req.params.id);
  if (!sheet) return res.status(404).json({ error: "Sheet not found" });
  const difficulty = normalizeDifficulty(req.body?.difficulty);
  const pageEnd = Number(req.body?.pageEnd || 3);
  const progress = getOrCreateProgress(req.user.id, sheet.id, difficulty);
  const lastQuiz = db
    .prepare(`
      SELECT score
      FROM advanced_quiz_results
      WHERE user_id = ? AND sheet_id = ? AND difficulty = ? AND page_end = ? AND is_final = 0
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT 1
    `)
    .get(req.user.id, sheet.id, difficulty, pageEnd);
  if (!lastQuiz || lastQuiz.score < 50 || lastQuiz.score >= 70) {
    return res.status(400).json({ error: "Continue is only available after a 50-69% checkpoint score." });
  }
  const unlockedPages = Math.min(sheet.total_pages, Math.max(progress.unlocked_pages, pageEnd + 3));
  db.prepare(`
    UPDATE advanced_sheet_progress
    SET unlocked_pages = ?, last_quizzed_page = MAX(last_quizzed_page, ?), needs_review_label = 'Needs review', updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND sheet_id = ? AND difficulty = ?
  `).run(unlockedPages, pageEnd, req.user.id, sheet.id, difficulty);
  const nextProgress = getOrCreateProgress(req.user.id, sheet.id, difficulty);
  return res.json({ data: buildAdvancedSession(req.user.id, sheet, nextProgress) });
});

platformRouter.get("/advanced/mistakes", (req, res) => {
  const rows = db
    .prepare(`
      SELECT am.*, m.title AS material_title, s.title AS sheet_title
      FROM advanced_mistakes am
      JOIN materials m ON m.id = am.material_id
      JOIN material_sheets s ON s.id = am.sheet_id
      WHERE am.user_id = ?
      ORDER BY datetime(am.created_at) DESC
    `)
    .all(req.user.id);
  const now = Date.now();
  const available = rows.filter((row) => new Date(row.review_available_at).getTime() <= now);
  const locked = rows.filter((row) => new Date(row.review_available_at).getTime() > now);
  return res.json({
    data: {
      available,
      locked,
      message: locked.length ? "These mistakes will be available for review after 24 hours." : ""
    }
  });
});

platformRouter.get("/questions", (req, res) => {
  const materialId = Number(req.query.materialId || 0);
  const difficulty = String(req.query.difficulty || "").trim().toLowerCase();
  const validDifficulty = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "";
  const rows = db
    .prepare(`
      SELECT q.*, m.title AS material_title,
        EXISTS(SELECT 1 FROM bookmarks b WHERE b.user_id = ? AND b.type = 'question' AND b.target_id = q.id) AS bookmarked
      FROM questions q
      JOIN materials m ON m.id = q.material_id
      WHERE (? = 0 OR q.material_id = ?)
        AND (? = '' OR LOWER(q.difficulty) = ?)
      ORDER BY q.id
    `)
    .all(req.user.id, materialId, materialId, validDifficulty, validDifficulty)
    .map((row) => ({
      id: row.id,
      materialId: row.material_id,
      materialTitle: row.material_title,
      prompt: row.prompt,
      choices: JSON.parse(row.choices_json),
      explanation: row.explanation,
      difficulty: row.difficulty,
      bookmarked: Boolean(row.bookmarked)
    }));

  return res.json({ data: rows });
});

platformRouter.post("/questions/:id/attempt", (req, res) => {
  const questionId = Number(req.params.id);
  const { selectedChoice } = req.body || {};
  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(questionId);
  if (!question) return res.status(404).json({ error: "Question not found" });
  if (!selectedChoice) return res.status(400).json({ error: "selectedChoice is required" });

  const isCorrect = selectedChoice === question.correct_choice ? 1 : 0;
  const xpAwarded = isCorrect ? 40 : 33;
  db.prepare("INSERT INTO attempts (user_id, question_id, selected_choice, is_correct) VALUES (?, ?, ?, ?)").run(
    req.user.id,
    questionId,
    selectedChoice,
    isCorrect
  );

  if (!isCorrect) {
    db.prepare("INSERT INTO review_items (user_id, type, target_id, reason, due_at) VALUES (?, 'question', ?, ?, datetime('now', '+20 minutes'))").run(
      req.user.id,
      questionId,
      "Incorrect answer"
    );
  }

  return res.json({
    data: {
      isCorrect: Boolean(isCorrect),
      correctChoice: question.correct_choice,
      explanation: question.explanation,
      xpAwarded,
      reviewScheduled: !Boolean(isCorrect),
      stats: getUserStats(req.user.id)
    }
  });
});

platformRouter.get("/study-plan", (req, res) => {
  const rows = db.prepare("SELECT id, time, topic FROM study_plan_items WHERE user_id = ? ORDER BY time").all(req.user.id);
  return res.json({ data: rows });
});

platformRouter.post("/study-plan", (req, res) => {
  const parsed = parseStudyPlanPayload(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const result = db.prepare("INSERT INTO study_plan_items (user_id, time, topic) VALUES (?, ?, ?)").run(req.user.id, parsed.time, parsed.topic);
  const row = db.prepare("SELECT id, time, topic FROM study_plan_items WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json({ data: row });
});

platformRouter.put("/study-plan/:id", (req, res) => {
  const parsed = parseStudyPlanPayload(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const result = db
    .prepare("UPDATE study_plan_items SET time = ?, topic = ? WHERE id = ? AND user_id = ?")
    .run(parsed.time, parsed.topic, req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Study plan item not found" });
  const row = db.prepare("SELECT id, time, topic FROM study_plan_items WHERE id = ?").get(req.params.id);
  return res.json({ data: row });
});

platformRouter.delete("/study-plan/:id", (req, res) => {
  db.prepare("DELETE FROM study_plan_items WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  return res.json({ data: { ok: true } });
});

platformRouter.get("/review", (req, res) => {
  const rows = db
    .prepare(`
      SELECT
        r.*,
        q.prompt,
        m.title AS material_title,
        CASE WHEN datetime(r.due_at) <= datetime('now') THEN 1 ELSE 0 END AS due_now
      FROM review_items r
      LEFT JOIN questions q ON r.type = 'question' AND q.id = r.target_id
      LEFT JOIN materials m ON (r.type = 'material' AND m.id = r.target_id) OR (q.material_id = m.id)
      WHERE r.user_id = ? AND r.completed_at IS NULL
      ORDER BY r.due_at
    `)
    .all(req.user.id);
  const dueNow = rows.filter((item) => item.due_now).length;
  return res.json({
    data: {
      summary: {
        total: rows.length,
        dueNow,
        upcoming: rows.length - dueNow
      },
      items: rows.map((item) => ({ ...item, dueNow: Boolean(item.due_now) }))
    }
  });
});

platformRouter.post("/review/:id/complete", (req, res) => {
  const result = db
    .prepare("UPDATE review_items SET completed_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND completed_at IS NULL")
    .run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Review item not found" });
  return res.json({ data: { ok: true } });
});

platformRouter.post("/bookmarks", (req, res) => {
  const { type, targetId } = req.body || {};
  if (!["question", "material"].includes(type) || !targetId) {
    return res.status(400).json({ error: "type and targetId are required" });
  }
  db.prepare("INSERT OR IGNORE INTO bookmarks (user_id, type, target_id) VALUES (?, ?, ?)").run(req.user.id, type, targetId);
  const row = db.prepare("SELECT * FROM bookmarks WHERE user_id = ? AND type = ? AND target_id = ?").get(req.user.id, type, targetId);
  return res.status(201).json({ data: row });
});

platformRouter.delete("/bookmarks/:id", (req, res) => {
  db.prepare("DELETE FROM bookmarks WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  return res.json({ data: { ok: true } });
});

platformRouter.get("/bookmarks", (req, res) => {
  const rows = db
    .prepare(`
      SELECT
        b.*,
        CASE
          WHEN b.type = 'question' THEN q.prompt
          ELSE m.title
        END AS title,
        CASE
          WHEN b.type = 'question' THEN qm.title
          ELSE m.description
        END AS meta
      FROM bookmarks b
      LEFT JOIN questions q ON b.type = 'question' AND q.id = b.target_id
      LEFT JOIN materials qm ON q.material_id = qm.id
      LEFT JOIN materials m ON b.type = 'material' AND m.id = b.target_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `)
    .all(req.user.id);
  return res.json({ data: rows });
});

platformRouter.get("/progress", (req, res) => {
  return res.json({ data: { stats: getUserStats(req.user.id), materials: getMaterialProgress(req.user.id) } });
});

platformRouter.get("/analytics", (req, res) => {
  const stats = getUserStats(req.user.id);
  const byDay = db
    .prepare(`
      SELECT date(created_at, 'localtime') AS date, COUNT(*) AS count
      FROM attempts
      WHERE user_id = ? AND date(created_at, 'localtime') >= date('now', 'localtime', '-27 days')
      GROUP BY date(created_at, 'localtime')
      ORDER BY date(created_at, 'localtime')
    `)
    .all(req.user.id);
  const difficulty = db
    .prepare(`
      SELECT
        q.difficulty,
        COUNT(DISTINCT q.id) AS total,
        COUNT(a.id) AS attempts,
        COALESCE(ROUND(AVG(CASE WHEN a.is_correct IS NULL THEN NULL ELSE a.is_correct END) * 100), 0) AS accuracy
      FROM questions q
      LEFT JOIN attempts a ON a.question_id = q.id AND a.user_id = ?
      GROUP BY q.difficulty
      ORDER BY
        CASE q.difficulty
          WHEN 'Easy' THEN 1
          WHEN 'Medium' THEN 2
          WHEN 'Hard' THEN 3
          ELSE 4
        END
    `)
    .all(req.user.id)
    .map((row) => ({
      difficulty: row.difficulty,
      total: row.total,
      attempts: row.attempts,
      accuracy: row.accuracy,
      coverage: row.total ? Math.min(100, Math.round((row.attempts / row.total) * 100)) : 0
    }));
  return res.json({ data: { stats, materials: getMaterialProgress(req.user.id), solvedByDay: byDay, difficulty } });
});

function getSheet(sheetId) {
  return db
    .prepare(`
      SELECT s.*, m.id AS material_id, m.title AS material_title, m.slug AS material_slug, m.icon AS material_icon
      FROM material_sheets s
      JOIN materials m ON m.id = s.material_id
      WHERE s.id = ?
    `)
    .get(sheetId);
}

function toSheetPayload(sheet) {
  return {
    id: sheet.id,
    materialId: sheet.material_id,
    materialTitle: sheet.material_title,
    materialSlug: sheet.material_slug,
    materialIcon: sheet.material_icon,
    sheetNumber: sheet.sheet_number,
    title: sheet.title,
    totalPages: sheet.total_pages,
    summary: sheet.summary
  };
}

function getOrCreateProgress(userId, sheetId, difficulty) {
  db.prepare(`
    INSERT OR IGNORE INTO advanced_sheet_progress (user_id, sheet_id, difficulty)
    VALUES (?, ?, ?)
  `).run(userId, sheetId, difficulty);
  return db
    .prepare("SELECT * FROM advanced_sheet_progress WHERE user_id = ? AND sheet_id = ? AND difficulty = ?")
    .get(userId, sheetId, difficulty);
}

function progressPayload(progress, sheet) {
  return {
    difficulty: progress.difficulty,
    unlockedPages: progress.unlocked_pages,
    lastQuizzedPage: progress.last_quizzed_page,
    xp: progress.xp,
    totalCorrect: progress.total_correct,
    totalAnswered: progress.total_answered,
    quizCount: progress.quiz_count,
    averageScore: progress.average_score,
    masteryStatus: progress.mastery_status,
    needsReviewLabel: progress.needs_review_label,
    completedAt: progress.completed_at,
    totalPages: sheet.total_pages
  };
}

function buildAdvancedSession(userId, sheet, progress) {
  const block = getPageBlock(progress.unlocked_pages, sheet.total_pages);
  const weakPoints = db
    .prepare(`
      SELECT topic, wrong_count AS wrongCount
      FROM advanced_weak_points
      WHERE user_id = ? AND sheet_id = ? AND difficulty = ?
      ORDER BY wrong_count DESC, datetime(last_wrong_at) DESC
      LIMIT 5
    `)
    .all(userId, sheet.id, progress.difficulty);
  return {
    mode: "advanced",
    sheet: toSheetPayload(sheet),
    difficulty: progress.difficulty,
    block,
    pages: buildSheetPages(sheet, block.pageStart, block.pageEnd),
    progress: progressPayload(progress, sheet),
    quizRequired: progress.last_quizzed_page < progress.unlocked_pages,
    finalAvailable: progress.last_quizzed_page >= sheet.total_pages && !progress.completed_at,
    weakPoints
  };
}

function saveAdvancedQuizResult(userId, sheet, difficulty, block, isFinal, result) {
  db.prepare(`
    INSERT INTO advanced_quiz_results (
      user_id, sheet_id, difficulty, page_start, page_end, is_final, score, correct_count,
      question_count, xp_awarded, message, weak_points_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    sheet.id,
    difficulty,
    block.pageStart,
    block.pageEnd,
    isFinal ? 1 : 0,
    result.score,
    result.correctCount,
    result.questionCount,
    result.xpAwarded,
    resultMessage(result.score, isFinal),
    JSON.stringify(result.weakPoints)
  );
}

function saveAdvancedMistakes(userId, sheet, difficulty, block, wrongItems) {
  if (!wrongItems.length) return;
  const insertMistake = db.prepare(`
    INSERT INTO advanced_mistakes (
      user_id, material_id, sheet_id, page_range, question, user_answer, correct_answer,
      explanation, difficulty, topic, review_available_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'))
  `);
  const upsertWeakPoint = db.prepare(`
    INSERT INTO advanced_weak_points (user_id, sheet_id, difficulty, topic)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, sheet_id, difficulty, topic) DO UPDATE SET
      wrong_count = wrong_count + 1,
      last_wrong_at = CURRENT_TIMESTAMP
  `);

  db.exec("BEGIN");
  try {
    wrongItems.forEach((item) => {
      insertMistake.run(
        userId,
        sheet.material_id,
        sheet.id,
        `${block.pageStart}-${block.pageEnd}`,
        item.question,
        item.userAnswer,
        item.correctAnswer,
        item.explanation,
        difficulty,
        item.topic
      );
      upsertWeakPoint.run(userId, sheet.id, difficulty, item.topic);
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function updateAdvancedProgress(userId, sheet, progress, difficulty, block, isFinal, result) {
  const nextQuizCount = progress.quiz_count + 1;
  const nextAverage = Math.round(((progress.average_score * progress.quiz_count) + result.score) / nextQuizCount);
  const nextTotalCorrect = progress.total_correct + result.correctCount;
  const nextTotalAnswered = progress.total_answered + result.questionCount;
  const nextXp = progress.xp + result.xpAwarded;
  let unlockedPages = progress.unlocked_pages;
  let lastQuizzedPage = progress.last_quizzed_page;
  let masteryStatus = getMasteryStatus(nextAverage);
  let completedAt = progress.completed_at;
  let needsReviewLabel = null;

  if (isFinal) {
    if (result.score >= 80) {
      masteryStatus = "Mastered";
      completedAt = new Date().toISOString();
    } else {
      masteryStatus = nextAverage >= 60 ? "In progress" : "Not mastered";
      needsReviewLabel = "Needs review";
    }
  } else if (result.score >= 70) {
    unlockedPages = Math.min(sheet.total_pages, Math.max(progress.unlocked_pages, block.pageEnd + 3));
    lastQuizzedPage = Math.max(progress.last_quizzed_page, block.pageEnd);
    needsReviewLabel = result.score < 90 ? "Needs light review" : null;
  } else if (result.score >= 50) {
    needsReviewLabel = "Needs review";
  } else {
    needsReviewLabel = "Needs review";
  }

  db.prepare(`
    UPDATE advanced_sheet_progress
    SET unlocked_pages = ?,
        last_quizzed_page = ?,
        xp = ?,
        total_correct = ?,
        total_answered = ?,
        quiz_count = ?,
        average_score = ?,
        mastery_status = ?,
        needs_review_label = ?,
        completed_at = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND sheet_id = ? AND difficulty = ?
  `).run(
    unlockedPages,
    lastQuizzedPage,
    nextXp,
    nextTotalCorrect,
    nextTotalAnswered,
    nextQuizCount,
    nextAverage,
    masteryStatus,
    needsReviewLabel,
    completedAt,
    userId,
    sheet.id,
    difficulty
  );
  return getOrCreateProgress(userId, sheet.id, difficulty);
}
