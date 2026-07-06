import bcrypt from "bcryptjs";
import { db, migrate } from "./database.js";
import {
  achievements,
  announcements,
  communityPosts,
  defaultPlan,
  leaderboardEntries,
  materials,
  questionBank,
  sheetBlueprints
} from "./seedData.js";

export function seed() {
  migrate();

  const insertMaterial = db.prepare(`
    INSERT INTO materials (title, slug, description, icon, order_index)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      icon = excluded.icon,
      order_index = excluded.order_index
  `);

  db.exec("BEGIN");
  try {
    materials.forEach((material, index) => insertMaterial.run(...material, index + 1));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const demoEmail = "demo@dentify.local";
  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(demoEmail);
  let demoUserId = existingUser?.id;
  if (!existingUser) {
    const passwordHash = bcrypt.hashSync("dentify123", 10);
    const user = db
      .prepare("INSERT INTO users (name, email, password_hash, year) VALUES (?, ?, ?, ?)")
      .run("Rami H.", demoEmail, passwordHash, "3rd year");
    demoUserId = user.lastInsertRowid;

    const planStmt = db.prepare("INSERT INTO study_plan_items (user_id, time, topic) VALUES (?, ?, ?)");
    defaultPlan.forEach(([time, topic]) => planStmt.run(user.lastInsertRowid, time, topic));
  }
  if (demoUserId) {
    db.prepare(`
      INSERT INTO user_theme_settings (user_id, character, theme, auto_theme, updated_at)
      VALUES (?, 'white', 'night', 0, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        character = 'white',
        updated_at = CURRENT_TIMESTAMP
      WHERE character = 'black'
    `).run(demoUserId);
  }

  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (title, body, tone)
    VALUES (?, ?, ?)
    ON CONFLICT(title) DO UPDATE SET
      body = excluded.body,
      tone = excluded.tone
  `);
  const insertLeaderboard = db.prepare(`
    INSERT INTO leaderboard_entries (scope, name, label, metric, points, accuracy, rank_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(scope, rank_order) DO UPDATE SET
      name = excluded.name,
      label = excluded.label,
      metric = excluded.metric,
      points = excluded.points,
      accuracy = excluded.accuracy
  `);
  const insertAchievement = db.prepare(`
    INSERT INTO achievements (title, description, icon, metric, threshold, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(title) DO UPDATE SET
      description = excluded.description,
      icon = excluded.icon,
      metric = excluded.metric,
      threshold = excluded.threshold,
      order_index = excluded.order_index
  `);

  db.exec("BEGIN");
  try {
    announcements.forEach((item) => insertAnnouncement.run(item.title, item.body, item.tone));
    leaderboardEntries.forEach((entry) => insertLeaderboard.run(...entry));
    achievements.forEach((entry) => insertAchievement.run(...entry));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const materialBySlug = new Map(db.prepare("SELECT id, slug FROM materials").all().map((row) => [row.slug, row.id]));
  const insertSheet = db.prepare(`
    INSERT INTO material_sheets (material_id, sheet_number, title, total_pages, summary, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(material_id, sheet_number) DO UPDATE SET
      title = excluded.title,
      total_pages = excluded.total_pages,
      summary = excluded.summary,
      order_index = excluded.order_index
  `);

  db.exec("BEGIN");
  try {
    Object.entries(sheetBlueprints).forEach(([slug, topics]) => {
      const materialId = materialBySlug.get(slug);
      topics.forEach((topic, index) => {
        const sheetNumber = index + 1;
        insertSheet.run(
          materialId,
          sheetNumber,
          `Sheet ${sheetNumber}: ${topic}`,
          12,
          `${topic} with placeholder page content, advanced checkpoints, and later quiz-ready notes.`,
          sheetNumber
        );
      });
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const insertQuestion = db.prepare(`
    INSERT INTO questions (material_id, prompt, choices_json, correct_choice, explanation, difficulty)
    SELECT ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM questions WHERE material_id = ? AND prompt = ?
    )
  `);

  db.exec("BEGIN");
  try {
    questionBank.forEach((question) => {
      const materialId = materialBySlug.get(question.material);
      insertQuestion.run(
        materialId,
        question.prompt,
        JSON.stringify(question.choices),
        question.correct,
        question.explanation,
        question.difficulty,
        materialId,
        question.prompt
      );
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const userByEmail = new Map(db.prepare("SELECT id, email FROM users").all().map((row) => [row.email, row.id]));
  const insertPost = db.prepare(`
    INSERT INTO community_posts (user_id, body, tag, likes, replies)
    SELECT ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM community_posts WHERE user_id = ? AND body = ?
    )
  `);

  db.exec("BEGIN");
  try {
    communityPosts.forEach((post) => {
      const userId = userByEmail.get(post.authorEmail) || userByEmail.get(demoEmail);
      insertPost.run(userId, post.body, post.tag, post.likes, post.replies, userId, post.body);
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
