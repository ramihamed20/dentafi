const baseUrl = process.env.API_URL || "http://127.0.0.1:4000";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body.data;
}

async function requestStatus(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

const health = await request("/api/health");
const unauthenticatedDashboard = await requestStatus("/api/dashboard");
if (unauthenticatedDashboard.status !== 401) {
  throw new Error("Protected dashboard endpoint did not reject unauthenticated access.");
}
const invalidSessionDashboard = await requestStatus("/api/dashboard", {
  headers: { Authorization: "Bearer not-a-real-token" }
});
if (invalidSessionDashboard.status !== 401) {
  throw new Error("Protected dashboard endpoint did not reject an invalid bearer token.");
}
const smokeEmail = `smoke-${Date.now()}@dentify.local`;
const login = await request("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ name: "Smoke Student", email: smokeEmail, password: "dentify123", year: "3rd year" })
});
const duplicateRegister = await requestStatus("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ name: "Smoke Student Copy", email: smokeEmail, password: "dentify123", year: "3rd year" })
});
if (duplicateRegister.status !== 409) {
  throw new Error("Register accepted a duplicate email address.");
}
const invalidLogin = await requestStatus("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: smokeEmail, password: "wrong-password" })
});
if (invalidLogin.status !== 401) {
  throw new Error("Login accepted an invalid password.");
}
const auth = { Authorization: `Bearer ${login.token}` };
const me = await request("/api/me", { headers: auth });
const dashboard = await request("/api/dashboard", { headers: auth });
if (!dashboard.insight?.title || !dashboard.insight?.body || !dashboard.insight?.actionPath) {
  throw new Error("Dashboard did not return a personalized insight.");
}
const materials = await request("/api/materials", { headers: auth });
const community = await request("/api/community", { headers: auth });
if (!community.buddy?.name || !community.buddy?.sharedGoal) {
  throw new Error("Community did not return a study buddy suggestion.");
}
const ranked = await request("/api/ranked", { headers: auth });
const achievements = await request("/api/achievements", { headers: auth });
if (!Array.isArray(achievements.newlyUnlocked)) {
  throw new Error("Achievements did not return newlyUnlocked notification data.");
}
const savedThemeSettings = await request("/api/settings/theme", {
  method: "PUT",
  headers: auth,
  body: JSON.stringify({ character: "white", theme: "sunset", autoTheme: true })
});
const materialSheets = await request(`/api/materials/${materials[0].id}/sheets`, { headers: auth });
const firstSheet = materialSheets.sheets[0];
const normalSession = await request(`/api/sheets/${firstSheet.id}/start`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ mode: "normal" })
});
const advancedSession = await request(`/api/sheets/${firstSheet.id}/start`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ mode: "advanced", difficulty: "easy" })
});
const advancedQuiz = await request(
  `/api/sheets/${firstSheet.id}/quiz?difficulty=easy&pageStart=1&pageEnd=12`,
  { headers: auth }
);
if (advancedQuiz.pageEnd - advancedQuiz.pageStart + 1 > 3) {
  throw new Error("Advanced quiz returned more than 3 unlocked pages.");
}
const blockedContinue = await requestStatus(`/api/sheets/${firstSheet.id}/advanced/continue`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ difficulty: "hard", pageEnd: 3 })
});
if (blockedContinue.status !== 400) {
  throw new Error("Advanced continue was available before a 50-69% checkpoint score.");
}
await request(`/api/sheets/${firstSheet.id}/quiz/submit`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({
    difficulty: "easy",
    pageStart: advancedSession.block.pageStart,
    pageEnd: advancedSession.block.pageEnd,
    variant: advancedQuiz.variant,
    answers: advancedQuiz.questions.map((question) => ({
      questionId: question.id,
      selectedAnswer: question.choices[0]
    }))
  })
});
const advancedMistakes = await request("/api/advanced/mistakes", { headers: auth });
const questions = await request(`/api/questions?materialId=${materials[0].id}`, { headers: auth });
const easyQuestions = await request(`/api/questions?difficulty=Easy`, { headers: auth });
if (!easyQuestions.length || easyQuestions.some((question) => question.difficulty !== "Easy")) {
  throw new Error("Difficulty-filtered questions did not return only Easy questions.");
}
const firstAttempt = await request(`/api/questions/${questions[0].id}/attempt`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ selectedChoice: questions[0].choices[0] })
});
if (!firstAttempt.xpAwarded) {
  throw new Error("Question attempt did not return XP award metadata.");
}
const dashboardAfterAttempt = await request("/api/dashboard", { headers: auth });
if (!dashboardAfterAttempt.stats.dailyGoal || dashboardAfterAttempt.stats.dailyGoal.solvedToday < 1) {
  throw new Error("Daily goal stats did not include today's solved question.");
}
if (!dashboardAfterAttempt.stats.xp || dashboardAfterAttempt.stats.xp.total <= dashboard.stats.xp.total) {
  throw new Error("XP stats did not increase after a question attempt.");
}
if (!dashboardAfterAttempt.weeklyChallenge || dashboardAfterAttempt.weeklyChallenge.solved <= dashboard.weeklyChallenge.solved) {
  throw new Error("Weekly challenge did not advance after a question attempt.");
}
const analytics = await request("/api/analytics", { headers: auth });
if (!analytics.solvedByDay.length || !analytics.solvedByDay[0].date) {
  throw new Error("Analytics solvedByDay did not return dated heatmap data.");
}
if (!Array.isArray(analytics.difficulty) || !analytics.difficulty.length || !Object.prototype.hasOwnProperty.call(analytics.difficulty[0], "coverage")) {
  throw new Error("Analytics difficulty distribution did not return coverage data.");
}
const wrongChoice = questions[0].choices.find((choice) => choice !== firstAttempt.correctChoice) || questions[0].choices[0];
const wrongAttempt = await request(`/api/questions/${questions[0].id}/attempt`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ selectedChoice: wrongChoice })
});
if (!wrongAttempt.reviewScheduled) {
  throw new Error("Wrong answer did not report scheduled review metadata.");
}
const reviewQueue = await request("/api/review", { headers: auth });
if (!reviewQueue.summary || reviewQueue.summary.total < 1 || !Array.isArray(reviewQueue.items)) {
  throw new Error("Review queue did not return spaced review summary and items.");
}
await request(`/api/review/${reviewQueue.items[0].id}/complete`, { method: "POST", headers: auth });
const reviewQueueAfterComplete = await request("/api/review", { headers: auth });
if (reviewQueueAfterComplete.summary.total >= reviewQueue.summary.total) {
  throw new Error("Completing a review item did not reduce the active review queue.");
}
const bookmark = await request("/api/bookmarks", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ type: "question", targetId: questions[0].id })
});
const bookmarksBeforeDelete = await request("/api/bookmarks", { headers: auth });
await request(`/api/bookmarks/${bookmark.id}`, { method: "DELETE", headers: auth });
const bookmarksAfterDelete = await request("/api/bookmarks", { headers: auth });
if (bookmarksAfterDelete.some((item) => item.id === bookmark.id)) {
  throw new Error("Bookmark delete did not remove the saved item.");
}
const smokePost = await request("/api/community/posts", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ tag: "Smoke", body: "Smoke test community post from API verification." })
});
await request(`/api/community/posts/${smokePost.id}`, { method: "DELETE", headers: auth });
const invalidPlanCreate = await requestStatus("/api/study-plan", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ time: "24:00", topic: "" })
});
if (invalidPlanCreate.status !== 400) {
  throw new Error("Study plan create accepted invalid time/topic values.");
}
const plan = await request("/api/study-plan", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ time: "21:00", topic: "Smoke test review" })
});
const updatedPlan = await request(`/api/study-plan/${plan.id}`, {
  method: "PUT",
  headers: auth,
  body: JSON.stringify({ time: "21:30", topic: "Smoke test edited review" })
});
if (updatedPlan.time !== "21:30" || updatedPlan.topic !== "Smoke test edited review") {
  throw new Error("Study plan update did not return the edited item.");
}
const invalidPlanEdit = await requestStatus(`/api/study-plan/${plan.id}`, {
  method: "PUT",
  headers: auth,
  body: JSON.stringify({ time: "25:99", topic: " " })
});
if (invalidPlanEdit.status !== 400) {
  throw new Error("Study plan update accepted invalid time/topic values.");
}
await request(`/api/study-plan/${plan.id}`, { method: "DELETE", headers: auth });

console.log(
  JSON.stringify(
    {
      health,
      unauthenticatedDashboardStatus: unauthenticatedDashboard.status,
      invalidSessionDashboardStatus: invalidSessionDashboard.status,
      duplicateRegisterStatus: duplicateRegister.status,
      invalidLoginStatus: invalidLogin.status,
      user: me.email,
      dashboardStats: dashboard.stats,
      dashboardInsight: dashboard.insight,
      dailyGoal: dashboardAfterAttempt.stats.dailyGoal,
      xp: dashboardAfterAttempt.stats.xp,
      firstAttemptXp: firstAttempt.xpAwarded,
      weeklyChallenge: dashboardAfterAttempt.weeklyChallenge,
      easyQuestionCount: easyQuestions.length,
      heatmapDays: analytics.solvedByDay.length,
      difficultyLevels: analytics.difficulty.length,
      reviewQueue: reviewQueue.summary,
      reviewAfterComplete: reviewQueueAfterComplete.summary,
      materialCount: materials.length,
      sheetCount: materialSheets.sheets.length,
      normalStudyPages: normalSession.pages.length,
      advancedMode: {
        pages: advancedSession.pages.length,
        quizPageRange: `${advancedQuiz.pageStart}-${advancedQuiz.pageEnd}`,
        quizQuestions: advancedQuiz.questions.length,
        blockedContinueStatus: blockedContinue.status,
        lockedMistakes: advancedMistakes.locked.length
      },
      themeSettings: savedThemeSettings,
      bookmarkDelete: {
        before: bookmarksBeforeDelete.length,
        after: bookmarksAfterDelete.length
      },
      invalidStudyPlanCreateStatus: invalidPlanCreate.status,
      studyPlanEdit: updatedPlan,
      invalidStudyPlanEditStatus: invalidPlanEdit.status,
      communityPosts: community.posts.length,
      studyBuddy: community.buddy.name,
      rankedGroups: Object.keys(ranked.groups).length,
      achievements: achievements.summary
    },
    null,
    2
  )
);
