const ASSETS = {
  loginScene: "./assets/login-scene.png",
  mascot: "./assets/mascot-study.png",
  sceneLight: "./assets/dashboard-scene-light.png",
  sceneDark: "./assets/dashboard-scene-dark.png",
  refLogin: "./assets/reference-login.png",
  refLight: "./assets/reference-dashboard-light.png",
  refDark: "./assets/reference-dashboard-dark.png"
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "materials", label: "Materials", icon: "book" },
  { id: "questions", label: "Questions", icon: "circleHelp" },
  { id: "review", label: "Review", icon: "flame" },
  { id: "community", label: "Community", icon: "messages" },
  { id: "ranked", label: "Ranked", icon: "trophy" },
  { id: "analytics", label: "Analytics", icon: "barChart" },
  { id: "bookmarks", label: "Bookmarks", icon: "bookmark" }
];

const profileItems = [
  { id: "profile", label: "My Profile", icon: "user" },
  { id: "progress", label: "Progress", icon: "target" },
  { id: "achievements", label: "Achievements", icon: "award" },
  { id: "settings", label: "Settings", icon: "settings" },
  { id: "logout", label: "Logout", icon: "logOut" }
];

const pageMeta = {
  dashboard: ["Good evening, future dentist!", "Let's continue your journey."],
  materials: ["Materials", "Seven study areas ready for sheets, summaries, and doctor files."],
  questions: ["Questions", "Practice, timed exams, mistakes, and saved question workflows."],
  review: ["Review Center", "Your most important space for fixing weak topics."],
  community: ["Community", "Announcements, posts, discussions, and urgent alerts."],
  ranked: ["Ranked", "Weekly, monthly, batch, material, and solver leaderboards."],
  analytics: ["Analytics", "Accuracy, consistency, review performance, and readiness."],
  bookmarks: ["Bookmarks", "Saved questions, sheets, posts, and review items."],
  profile: ["My Profile", "Student account, batch, and learning identity."],
  progress: ["Progress", "Completion, time, solved questions, and material progress."],
  achievements: ["Achievements", "Badges earned from streaks, ranking, and question solving."],
  settings: ["Settings", "Theme, account, and notification preferences."]
};

const materialData = [
  ["Oral Anatomy", "book", 67, "18 sheets"],
  ["Oral Histology", "file", 54, "21 sheets"],
  ["Prosthodontics", "layers", 38, "16 sheets"],
  ["Periodontology", "activity", 42, "14 sheets"],
  ["Endodontics", "target", 71, "19 sheets"],
  ["Local Anesthesia", "shield", 29, "12 sheets"],
  ["Dental Materials", "clipboard", 45, "17 sheets"]
];

const questionSections = [
  ["Practice Questions", "MCQ drills by material and topic.", "circleHelp"],
  ["Daily Challenge", "Ten focused questions refreshed each day.", "calendar"],
  ["Mock Exams", "Full exam sets with explanations.", "clipboard"],
  ["Timed Exams", "Pressure practice with countdown support.", "clock"],
  ["Incorrect Questions", "Mistakes grouped for correction.", "xCircle"],
  ["Saved Questions", "Questions saved for later review.", "bookmark"]
];

const state = {
  theme: localStorage.getItem("dentify.theme") || "dark",
  authenticated: localStorage.getItem("dentify.authed") === "true",
  authView: "login",
  page: getInitialPage(),
  profileOpen: false,
  mobileOpen: false
};

const app = document.querySelector("#app");
setTheme(state.theme);
render();
scrollToTop();

window.addEventListener("hashchange", () => {
  const id = normalizePage(location.hash.replace("#", ""));
  if (id) {
    state.page = id;
    state.authenticated = true;
    state.profileOpen = false;
    state.mobileOpen = false;
    localStorage.setItem("dentify.authed", "true");
    render();
    scrollToTop();
  }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target.closest("[data-auth-form]");
  if (!form) return;
  login();
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-route], [data-auth]");
  if (!target) {
    if (state.profileOpen) closeProfileMenu();
    return;
  }

  const route = target.dataset.route;
  const action = target.dataset.action;
  const auth = target.dataset.auth;

  if (route) {
    goTo(route);
    return;
  }

  if (auth) {
    state.authView = auth;
    state.profileOpen = false;
    render();
    return;
  }

  if (action === "login") login();
  if (action === "logout") logout();
  if (action === "toggle-theme") setTheme(state.theme === "dark" ? "light" : "dark");
  if (action === "toggle-profile") toggleProfile();
  if (action === "toggle-mobile") toggleMobileDrawer();
  if (action === "close-mobile") closeMobileDrawer();
});

function getInitialPage() {
  const hashPage = normalizePage(location.hash.replace("#", ""));
  return hashPage || "dashboard";
}

function normalizePage(page) {
  const ids = new Set([...navItems.map((item) => item.id), "profile", "progress", "achievements", "settings"]);
  return ids.has(page) ? page : "";
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("dentify.theme", theme);
  updateThemeIcon();
}

function login() {
  state.authenticated = true;
  state.authView = "login";
  localStorage.setItem("dentify.authed", "true");
  goTo("dashboard");
}

function logout() {
  state.authenticated = false;
  state.profileOpen = false;
  state.mobileOpen = false;
  localStorage.removeItem("dentify.authed");
  history.replaceState(null, "", location.pathname);
  render();
  scrollToTop();
}

function goTo(page) {
  if (page === "logout") {
    logout();
    return;
  }
  state.page = normalizePage(page) || "dashboard";
  state.authenticated = true;
  state.profileOpen = false;
  state.mobileOpen = false;
  localStorage.setItem("dentify.authed", "true");
  if (location.hash !== `#${state.page}`) {
    history.pushState(null, "", `#${state.page}`);
  }
  render();
  scrollToTop();
}

function scrollToTop() {
  requestAnimationFrame(() => window.scrollTo(0, 0));
}

function toggleProfile() {
  state.profileOpen = !state.profileOpen;
  state.mobileOpen = false;
  var wrap = document.querySelector(".avatar-wrap");
  if (wrap) {
    var existing = wrap.querySelector(".profile-menu");
    if (state.profileOpen && !existing) {
      wrap.insertAdjacentHTML("beforeend", renderProfileMenu());
    } else if (!state.profileOpen && existing) {
      existing.remove();
    }
  }
  updateDrawerDOM();
}

function toggleMobileDrawer() {
  state.mobileOpen = !state.mobileOpen;
  state.profileOpen = false;
  updateDrawerDOM();
  var menu = document.querySelector(".profile-menu");
  if (menu) menu.remove();
}

function closeMobileDrawer() {
  state.mobileOpen = false;
  updateDrawerDOM();
}

function closeProfileMenu() {
  state.profileOpen = false;
  var menu = document.querySelector(".profile-menu");
  if (menu) menu.remove();
}

function updateDrawerDOM() {
  var backdrop = document.querySelector(".drawer-backdrop");
  var drawer = document.querySelector(".mobile-drawer");
  if (backdrop) backdrop.classList.toggle("open", state.mobileOpen);
  if (drawer) drawer.classList.toggle("open", state.mobileOpen);
}

function updateThemeIcon() {
  var btn = document.querySelector(".theme-toggle-btn");
  if (btn) btn.innerHTML = icon(state.theme === "dark" ? "sun" : "moon");
}

function render() {
  app.innerHTML = state.authenticated ? renderShell() : renderAuth();
  var meta = pageMeta[state.page];
  document.title = state.authenticated && meta ? meta[0] + " \u2014 Dentify" : "Dentify";
}

function renderAuth() {
  const isSignup = state.authView === "signup";
  const isForgot = state.authView === "forgot";
  const title = isSignup ? "Create account" : isForgot ? "Reset password" : "Welcome back!";
  const subtitle = isSignup
    ? "Start your Dentify learning journey."
    : isForgot
      ? "Enter your email to receive a reset link."
      : "Log in to continue your journey.";

  return `
    <main class="auth-page app-shell">
      <section class="auth-card" aria-label="Dentify authentication">
        <div class="auth-form-panel">
          ${brand()}
          <h1 class="auth-title">${title}</h1>
          <p class="auth-subtitle">${subtitle}</p>
          <form class="auth-form" data-auth-form>
            ${isSignup ? field("Full name", "text", "Enter your full name", "user") : ""}
            ${field("Email", "email", "Enter your email", "mail")}
            ${!isForgot ? field("Password", "password", "Enter your password", "lock", true) : ""}
            ${isSignup ? field("Confirm password", "password", "Confirm your password", "lock", true) : ""}
            ${
              !isSignup && !isForgot
                ? `<div class="form-row">
                    <label class="check-row"><input type="checkbox" checked /> <span>Remember me</span></label>
                    <button class="text-link" type="button" data-auth="forgot">Forgot password?</button>
                  </div>`
                : ""
            }
            <button class="btn btn-primary" type="submit">${isSignup ? "Create Account" : isForgot ? "Send Reset Link" : "Log In"}</button>
            ${!isForgot ? `<div class="divider">or</div><button class="btn btn-ghost" type="button" data-action="login">${googleMark()} Continue with Google</button>` : ""}
          </form>
          <p class="auth-switch">
            ${
              isSignup
                ? `Already have an account? <button class="text-link" type="button" data-auth="login">Log in</button>`
                : isForgot
                  ? `<button class="text-link" type="button" data-auth="login">Back to login</button>`
                  : `Don't have an account? <button class="text-link" type="button" data-auth="signup">Sign up</button>`
            }
          </p>
        </div>
        <aside class="auth-art" aria-label="Dentify study illustration">
          <img src="${ASSETS.loginScene}" alt="Dentify mascot studying at night" />
        </aside>
      </section>
    </main>
  `;
}

function renderShell() {
  const meta = pageMeta[state.page] || pageMeta.dashboard;
  return `
    <div class="dashboard-shell app-shell">
      ${renderSidebar()}
      <main class="content-frame">
        <header class="topbar">
          <button class="icon-btn mobile-menu-btn" type="button" data-action="toggle-mobile" aria-label="Open navigation">${icon("menu")}</button>
          <div class="page-heading">
            <h1>${meta[0]}</h1>
            <p>${meta[1]}</p>
          </div>
          <label class="search-box">
            ${icon("search", "icon-sm")}
            <input type="search" placeholder="Search Dentify" aria-label="Search Dentify" />
          </label>
          <button class="icon-btn theme-toggle-btn" type="button" data-action="toggle-theme" aria-label="Toggle theme">${icon(state.theme === "dark" ? "sun" : "moon")}</button>
          <button class="icon-btn" type="button" aria-label="Notifications">${icon("bell")}<span class="notification-dot"></span></button>
          <div class="avatar-wrap">
            <button class="icon-btn avatar-btn" type="button" data-action="toggle-profile" aria-label="Open profile menu">
              <img src="${ASSETS.mascot}" alt="Student avatar" />
            </button>
            ${state.profileOpen ? renderProfileMenu() : ""}
          </div>
        </header>
        <section class="page fade-in">${renderPage()}</section>
      </main>
      ${renderMobileNav()}
      ${renderMobileDrawer()}
    </div>
  `;
}

function renderSidebar() {
  return `
    <aside class="sidebar" aria-label="Main navigation">
      ${brand(true)}
      <nav>
        <ul class="nav-list">${navItems.map((item) => `<li>${navButton(item)}</li>`).join("")}</ul>
      </nav>
      <div class="sidebar-streak">
        <p class="streak-title">${icon("flame", "icon-sm")} Keep going!</p>
        <p class="card-subtitle">14 day streak</p>
        <div class="tiny-progress" aria-label="Streak progress"><span style="width:72%"></span></div>
      </div>
    </aside>
  `;
}

function renderMobileNav() {
  const items = [
    navItems[0],
    navItems[1],
    navItems[2],
    navItems[3],
    { id: "more", label: "More", icon: "menu" }
  ];
  return `
    <nav class="mobile-nav" aria-label="Mobile navigation">
      ${items.map((item) => {
        const isMore = item.id === "more";
        const active = state.page === item.id || (!navItems.slice(0, 4).some((nav) => nav.id === state.page) && isMore);
        return `<button class="mobile-nav-btn ${active ? "active" : ""}" type="button" ${isMore ? `data-action="toggle-mobile"` : `data-route="${item.id}"`} aria-label="${item.label}">
          ${icon(item.icon)}
          <span>${item.label}</span>
        </button>`;
      }).join("")}
    </nav>
  `;
}

function renderMobileDrawer() {
  return `
    <div class="drawer-backdrop ${state.mobileOpen ? "open" : ""}" data-action="close-mobile" aria-hidden="true"></div>
    <aside class="mobile-drawer ${state.mobileOpen ? "open" : ""}" aria-label="All navigation">
      <div class="drawer-head">
        ${brand(true)}
        <button class="icon-btn drawer-close" type="button" data-action="close-mobile" aria-label="Close navigation">${icon("x")}</button>
      </div>
      <ul class="nav-list">${navItems.map((item) => `<li>${navButton(item)}</li>`).join("")}</ul>
    </aside>
  `;
}

function renderProfileMenu() {
  return `
    <div class="profile-menu" role="menu">
      ${profileItems.map((item) => `
        <button class="profile-option" type="button" ${item.id === "logout" ? `data-action="logout"` : `data-route="${item.id}"`} role="menuitem">
          ${icon(item.icon, "icon-sm")} ${item.label}
        </button>
      `).join("")}
    </div>
  `;
}

function navButton(item) {
  return `
    <button class="nav-btn ${state.page === item.id ? "active" : ""}" type="button" data-route="${item.id}">
      ${icon(item.icon, "icon-sm")}
      <span>${item.label}</span>
    </button>
  `;
}

function renderPage() {
  const pages = {
    dashboard: renderDashboard,
    materials: renderMaterials,
    questions: renderQuestions,
    review: renderReview,
    community: renderCommunity,
    ranked: renderRanked,
    analytics: renderAnalytics,
    bookmarks: renderBookmarks,
    profile: renderProfile,
    progress: renderProgress,
    achievements: renderAchievements,
    settings: renderSettings
  };
  return (pages[state.page] || renderDashboard)();
}

function renderDashboard() {
  return `
    <section class="stats-grid">
      ${statCard("48", "Materials completed", "file", "purple")}
      ${statCard("350", "Questions solved", "circleHelp", "purple")}
      ${statCard("92%", "Accuracy", "checkCircle", "gold")}
      ${statCard("24", "Review queue", "clock", "green")}
      ${statCard("14", "Day streak", "flame", "gold")}
    </section>
    <section class="dashboard-grid">
      <div class="dashboard-col">
        <article class="card">
          <h2>Continue Studying</h2>
          <h3 class="continue-title">Oral Histology</h3>
          <div class="progress-line" aria-label="Oral Histology progress"><span style="width:67%"></span></div>
          <div class="progress-meta"><span>Next review: 12 questions</span><strong>67%</strong></div>
          <button class="btn btn-primary" type="button" data-route="materials">Continue</button>
        </article>
        <article class="card">
          <h2>Quick Access</h2>
          <div class="quick-grid">
            ${quickTile("Materials", "file", "materials")}
            ${quickTile("Questions", "circleHelp", "questions")}
            ${quickTile("Review", "calendar", "review")}
            ${quickTile("Bookmarks", "bookmark", "bookmarks")}
          </div>
        </article>
        <article class="card quote-card">
          <span class="quote-mark">"</span>
          <p class="card-subtitle">Discipline today, a confident dentist tomorrow.</p>
          <span class="material-icon">${icon("tooth")}</span>
        </article>
      </div>
      <div class="dashboard-col">
        <article class="card">
          <h2>Recent Activity</h2>
          <ul class="activity-list">
            ${activity("Reviewed: Caries", "2h ago", "checkCircle")}
            ${activity("Quiz: Endodontics", "4h ago", "circleHelp", "purple")}
            ${activity("Sheet: Local Anesthesia", "Yesterday", "file", "gold")}
            ${activity("Mock Exam Completed", "Yesterday", "checkCircle")}
          </ul>
        </article>
        <article class="card">
          <h2>Today's Review</h2>
          <div class="topic-list">
            ${topic("Caries prevention", 82)}
            ${topic("Periodontal pockets", 65)}
            ${topic("Root canal steps", 48)}
          </div>
        </article>
        <article class="card">
          <h2>Weak Topics</h2>
          <div class="topic-list">
            ${topic("Prosthodontic impressions", 36)}
            ${topic("Local anesthesia doses", 42)}
            ${topic("Histology slides", 51)}
          </div>
        </article>
        <article class="card">
          <h2>Study Streak</h2>
          <div class="card-top">
            <div>
              <p class="stat-number">14 days</p>
              <p class="card-subtitle">Next badge at 21 days.</p>
            </div>
            <span class="stat-icon gold">${icon("flame")}</span>
          </div>
          <div class="progress-line" aria-label="Study streak progress" style="margin-top:16px"><span style="width:72%"></span></div>
        </article>
      </div>
      <article class="scene-card" aria-label="Dentify mascot scene">
        <img class="scene-light" src="${ASSETS.sceneLight}" alt="Dentify mascot studying in a bright room" loading="lazy" />
        <img class="scene-dark" src="${ASSETS.sceneDark}" alt="Dentify mascot studying at night" loading="lazy" />
      </article>
    </section>
  `;
}

function renderMaterials() {
  return `
    <div class="tabs">
      ${["Sheets", "Summaries", "Doctor files", "Saved"].map((tab, index) => `<span class="tab-chip ${index === 0 ? "active" : ""}">${icon(index === 0 ? "file" : index === 1 ? "book" : index === 2 ? "folder" : "bookmark", "icon-sm")} ${tab}</span>`).join("")}
    </div>
    <section class="wide-grid">
      ${materialData.map(([title, iconName, progress, sheets]) => `
        <article class="material-card">
          <div class="card-top">
            <div>
              <h2 class="card-title">${title}</h2>
              <p class="card-subtitle">${sheets}</p>
            </div>
            <span class="material-icon">${icon(iconName)}</span>
          </div>
          <div class="progress-line" aria-label="${title} progress"><span style="width:${progress}%"></span></div>
          <div class="progress-meta"><span>${progress}% complete</span><span>Ready</span></div>
          <button class="btn btn-soft" type="button">Open</button>
        </article>
      `).join("")}
    </section>
  `;
}

function renderQuestions() {
  return `
    <section class="wide-grid">
      ${questionSections.map(([title, subtitle, iconName]) => placeholderCard(title, subtitle, iconName)).join("")}
    </section>
    <section class="two-grid" style="margin-top:18px">
      <article class="card">
        <div class="card-top">
          <div>
            <h2 class="card-title">Question Preview</h2>
            <p class="card-subtitle">MCQ structure with answer feedback and explanation.</p>
          </div>
          <span class="pill gold">${icon("clock", "icon-sm")} 01:24</span>
        </div>
        <div class="question-preview">
          <p><strong>Which tissue forms the main bulk of the tooth?</strong></p>
          <div class="answer-choice">A. Enamel</div>
          <div class="answer-choice correct">${icon("checkCircle", "icon-sm")} B. Dentin</div>
          <div class="answer-choice wrong">${icon("xCircle", "icon-sm")} C. Cementum</div>
          <div class="answer-choice">D. Pulp</div>
          <p class="card-subtitle">Dentin surrounds the pulp and forms most of the tooth structure.</p>
        </div>
      </article>
      <article class="card">
        <h2>Future Question Tools</h2>
        <div class="tabs">
          <span class="tab-chip active">${icon("save", "icon-sm")} Save</span>
          <span class="tab-chip">${icon("flag", "icon-sm")} Report</span>
          <span class="tab-chip">${icon("book", "icon-sm")} Explanation</span>
          <span class="tab-chip">${icon("target", "icon-sm")} Timer</span>
        </div>
        <p class="card-subtitle">The screen is prepared for MCQ choices, explanations, correct or wrong feedback, timers, saved questions, and reporting.</p>
      </article>
    </section>
  `;
}

function renderReview() {
  const sections = [
    ["Today's Review", "24 cards scheduled from weak and recent topics.", "calendar"],
    ["Mistakes Review", "Incorrect answers grouped by cause and material.", "xCircle"],
    ["Weak Topics", "Lowest accuracy topics raised to the top.", "target"],
    ["Saved for Review", "Questions and sheets marked for later.", "bookmark"],
    ["Weekly Review", "A longer reset session for the end of the week.", "activity"]
  ];
  return `
    <section class="review-hero">
      <div>
        <h2 class="hero-title">Fix the weak spots before they become exam gaps.</h2>
        <p class="hero-copy">Review is the center of Dentify. It prioritizes mistakes, saved items, and low-confidence topics using clear daily queues.</p>
        <button class="btn btn-primary" type="button">Start Today's Review</button>
      </div>
      <div class="review-meter" aria-label="Review readiness 74 percent"><strong>74%</strong></div>
    </section>
    <section class="wide-grid">
      ${sections.map(([title, subtitle, iconName]) => placeholderCard(title, subtitle, iconName)).join("")}
    </section>
  `;
}

function renderCommunity() {
  return `
    <section class="two-grid">
      <article class="card">
        <h2>Student Post</h2>
        <div class="composer">
          <textarea placeholder="Share a study note or ask your batch..." aria-label="Post composer"></textarea>
          <button class="btn btn-primary" type="button">${icon("plus", "icon-sm")} Post</button>
        </div>
      </article>
      <article class="card">
        <h2>Doctor Announcements</h2>
        <ul class="activity-list">
          ${activity("Operative Dentistry sheet updated", "Today", "file", "gold")}
          ${activity("Exam room list will be posted tomorrow", "1d ago", "bell", "purple")}
          ${activity("New prosthodontics summary added", "2d ago", "book")}
        </ul>
      </article>
    </section>
    <section class="wide-grid" style="margin-top:18px">
      ${placeholderCard("Student Posts", "Batch posts, tips, and shared resources.", "messages")}
      ${placeholderCard("Questions & Discussions", "Threaded questions for unclear topics.", "circleHelp")}
      ${placeholderCard("Important Alerts", "Pinned academic alerts and deadlines.", "bell")}
    </section>
  `;
}

function renderRanked() {
  return `
    <section class="wide-grid">
      <article class="leader-card featured">
        <h2 class="card-title">Weekly Champion</h2>
        <p class="card-subtitle">Lina A. solved 186 questions with 94% accuracy.</p>
        <div class="tabs"><span class="pill gold">${icon("trophy", "icon-sm")} 1st place</span></div>
      </article>
      ${placeholderCard("Monthly Champion", "Top monthly learner with balanced study progress.", "award")}
      ${placeholderCard("Material Ranking", "Separate ranking per dental material.", "barChart")}
    </section>
    <section class="two-grid" style="margin-top:18px">
      <article class="card">
        <h2>Batch Ranking</h2>
        <ul class="rank-list">
          ${rankRow(1, "Lina A.", "4,820 pts")}
          ${rankRow(2, "Omar M.", "4,510 pts")}
          ${rankRow(3, "Sara K.", "4,240 pts")}
          ${rankRow(4, "Yousef N.", "3,970 pts")}
        </ul>
      </article>
      <article class="card">
        <h2>Top Solvers</h2>
        <ul class="rank-list">
          ${rankRow(1, "Nour H.", "620 solved")}
          ${rankRow(2, "Ali R.", "584 solved")}
          ${rankRow(3, "Maya S.", "558 solved")}
          ${rankRow(4, "Hiba F.", "531 solved")}
        </ul>
      </article>
    </section>
  `;
}

function renderAnalytics() {
  return `
    <section class="analytics-hero">
      <div>
        <h2 class="hero-title">Predicted readiness: 82%</h2>
        <p class="hero-copy">Readiness combines accuracy, solved questions, review completion, and study consistency.</p>
        <div class="tabs">
          <span class="pill gold">${icon("checkCircle", "icon-sm")} Strong in anatomy</span>
          <span class="tab-chip">${icon("target", "icon-sm")} Review prosthodontics</span>
        </div>
      </div>
      <img src="${ASSETS.mascot}" alt="Dentify mascot studying" style="width:min(220px,100%);border-radius:22px;margin:auto" loading="lazy" />
    </section>
    <section class="two-grid">
      <article class="card chart-card">
        <h2>Accuracy by Material</h2>
        <div class="bar-chart">
          ${bar("Anatomy", 92)}
          ${bar("Histology", 84)}
          ${bar("Endodontics", 76)}
          ${bar("Prostho", 61)}
          ${bar("Perio", 68)}
        </div>
      </article>
      <article class="card chart-card">
        <h2>Questions Solved Over Time</h2>
        <div class="line-chart" aria-label="Questions solved over seven days">
          ${[42, 58, 33, 75, 64, 88, 70].map((height, index) => `<div class="line-col"><span style="height:${height}%"></span><small>D${index + 1}</small></div>`).join("")}
        </div>
      </article>
      ${placeholderCard("Weakest Topics", "Prosthodontic impressions, anesthesia doses, and perio charting.", "target")}
      ${placeholderCard("Review Performance", "84% of scheduled review completed this week.", "activity")}
      ${placeholderCard("Study Consistency", "Five focused days from the last seven.", "calendar")}
      ${placeholderCard("Predicted Readiness", "Ready for anatomy and histology; review prostho next.", "checkCircle")}
    </section>
  `;
}

function renderBookmarks() {
  const groups = [
    ["Saved Questions", "42 MCQs saved for focused practice.", "circleHelp"],
    ["Saved Sheets", "18 sheets marked for later reading.", "file"],
    ["Saved Posts", "6 community posts bookmarked.", "messages"],
    ["Saved Reviews", "11 review cards pinned.", "bookmark"]
  ];
  return `
    <section class="wide-grid">
      ${groups.map(([title, subtitle, iconName]) => placeholderCard(title, subtitle, iconName)).join("")}
    </section>
    <section class="card" style="margin-top:18px">
      <h2>Latest Saved Items</h2>
      <ul class="bookmark-list">
        ${bookmarkRow("MCQ: Mandibular nerve branches", "Questions")}
        ${bookmarkRow("Sheet: Local Anesthesia blocks", "Sheets")}
        ${bookmarkRow("Post: Histology slide tips", "Community")}
        ${bookmarkRow("Review: Periodontal pockets", "Review")}
      </ul>
    </section>
  `;
}

function renderProfile() {
  return `
    <section class="profile-grid">
      <article class="profile-card">
        <div class="profile-photo"><img src="${ASSETS.mascot}" alt="Student profile mascot" loading="lazy" /></div>
        <h2 class="card-title" style="margin-top:16px">Rami H.</h2>
        <p class="card-subtitle">Dental student - 3rd year</p>
        <div class="tabs">
          <span class="pill gold">${icon("flame", "icon-sm")} 14 day streak</span>
          <span class="tab-chip">${icon("trophy", "icon-sm")} Top 12%</span>
        </div>
      </article>
      <article class="profile-card">
        <h2>Learning Identity</h2>
        <div class="topic-list">
          ${topic("Overall completion", 58)}
          ${topic("Question confidence", 72)}
          ${topic("Review discipline", 81)}
          ${topic("Community activity", 46)}
        </div>
      </article>
    </section>
  `;
}

function renderProgress() {
  return `
    <section class="stats-grid">
      ${statCard("58%", "Overall completion", "target", "purple")}
      ${statCard("42h", "Total study time", "clock", "gold")}
      ${statCard("48", "Completed materials", "file", "purple")}
      ${statCard("350", "Solved questions", "circleHelp", "green")}
      ${statCard("14", "Day streak", "flame", "gold")}
    </section>
    <section class="two-grid">
      ${placeholderCard("Completed Materials", "Oral Anatomy, Endodontics basics, and caries prevention are strongest.", "checkCircle")}
      ${placeholderCard("Next Milestone", "Finish 75 more questions to unlock the next solver badge.", "award")}
    </section>
  `;
}

function renderAchievements() {
  const badges = [
    ["Streak Badge", "14 days of continuous study.", "flame"],
    ["Ranking Badge", "Top 12% in batch ranking.", "trophy"],
    ["Question Solver", "350 questions solved.", "circleHelp"],
    ["Review Finisher", "Weekly review completed twice.", "checkCircle"],
    ["Bookmark Keeper", "70 saved learning items.", "bookmark"],
    ["Material Explorer", "All seven materials opened.", "book"]
  ];
  return `<section class="wide-grid">${badges.map(([title, subtitle, iconName]) => placeholderCard(title, subtitle, iconName)).join("")}</section>`;
}

function renderSettings() {
  return `
    <section class="profile-card">
      <h2>Preferences</h2>
      <div class="settings-row">
        <div>
          <strong>Theme</strong>
          <p class="card-subtitle">Switch between the PDF-inspired dark mode and soft light mode.</p>
        </div>
        <button class="toggle" type="button" data-action="toggle-theme" aria-label="Toggle theme"></button>
      </div>
      <div class="settings-row">
        <div>
          <strong>Account details</strong>
          <p class="card-subtitle">Name, email, batch, and university placeholders.</p>
        </div>
        <span class="tab-chip">${icon("user", "icon-sm")} Ready</span>
      </div>
      <div class="settings-row">
        <div>
          <strong>Notifications</strong>
          <p class="card-subtitle">Daily review, doctor announcements, and ranking alerts.</p>
        </div>
        <span class="tab-chip">${icon("bell", "icon-sm")} On</span>
      </div>
    </section>
    <section class="reference-strip" aria-label="PDF reference images used for this private site">
      <img src="${ASSETS.refLogin}" alt="Dentify login reference from PDF" loading="lazy" />
      <img src="${ASSETS.refDark}" alt="Dentify dark dashboard reference from PDF" loading="lazy" />
      <img src="${ASSETS.refLight}" alt="Dentify light dashboard reference from PDF" loading="lazy" />
    </section>
  `;
}

function field(label, type, placeholder, iconName, hasEndIcon = false) {
  return `
    <div class="field">
      <label>${label}</label>
      <div class="input-shell">
        ${icon(iconName, "icon-sm")}
        <input type="${type}" placeholder="${placeholder}" required ${type === "email" ? "autocomplete=\"email\"" : type === "password" ? "autocomplete=\"current-password\"" : ""} />
        ${hasEndIcon ? icon("eyeOff", "icon-sm") : ""}
      </div>
    </div>
  `;
}

function brand(compact = false) {
  return `
    <div class="brand">
      <span class="logo-mark">${icon("tooth", "icon-lg")}</span>
      <div>
        <p class="brand-name">Dentify</p>
        ${compact ? "" : `<p class="brand-tagline">Learn. Practice. Excel.</p>`}
      </div>
    </div>
  `;
}

function statCard(value, label, iconName, tone = "purple") {
  return `
    <article class="stat-card">
      <span class="stat-icon ${tone}">${icon(iconName)}</span>
      <div>
        <p class="stat-number">${value}</p>
        <p class="stat-label">${label}</p>
      </div>
    </article>
  `;
}

function quickTile(label, iconName, route) {
  return `<button class="quick-tile" type="button" data-route="${route}"><span class="quick-icon">${icon(iconName)}</span><span>${label}</span></button>`;
}

function activity(label, time, iconName, tone = "") {
  return `
    <li class="activity-item">
      <span class="status-dot ${tone}">${icon(iconName, "icon-sm")}</span>
      <span>${label}</span>
      <small>${time}</small>
    </li>
  `;
}

function topic(label, percent) {
  return `
    <div class="topic-row">
      <div style="min-width:0;flex:1">
        <div class="progress-meta" style="margin:0 0 7px"><span>${label}</span><strong>${percent}%</strong></div>
        <div class="progress-line"><span style="width:${percent}%"></span></div>
      </div>
    </div>
  `;
}

function placeholderCard(title, subtitle, iconName) {
  return `
    <article class="placeholder-card">
      <div class="card-top">
        <div>
          <h2 class="card-title">${title}</h2>
          <p class="card-subtitle">${subtitle}</p>
        </div>
        <span class="material-icon">${icon(iconName)}</span>
      </div>
    </article>
  `;
}

function rankRow(place, name, value) {
  return `
    <li class="rank-row">
      <span class="rank-place">${place}</span>
      <strong>${name}</strong>
      <small>${value}</small>
    </li>
  `;
}

function bookmarkRow(title, group) {
  return `
    <li class="bookmark-row">
      <span class="status-dot purple">${icon("bookmark", "icon-sm")}</span>
      <strong>${title}</strong>
      <small>${group}</small>
    </li>
  `;
}

function bar(label, percent) {
  return `
    <div class="bar-row">
      <span>${label}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${percent}%"></span></span>
      <strong>${percent}%</strong>
    </div>
  `;
}

function googleMark() {
  return `<svg class="icon-sm" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285f4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.37a4.59 4.59 0 0 1-1.99 3.01v2.5h3.22c1.88-1.73 3-4.28 3-7.5Z"/>
    <path fill="#34a853" d="M12 22c2.7 0 4.96-.9 6.6-2.43l-3.22-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.81-1.76-5.6-4.12H3.08v2.58A9.98 9.98 0 0 0 12 22Z"/>
    <path fill="#fbbc05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.08a10.02 10.02 0 0 0 0 8.96l3.32-2.58Z"/>
    <path fill="#ea4335" d="M12 5.98c1.47 0 2.8.5 3.84 1.5l2.86-2.86A9.58 9.58 0 0 0 12 2 9.98 9.98 0 0 0 3.08 7.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z"/>
  </svg>`;
}

function icon(name, className = "icon") {
  const paths = {
    tooth: `<path d="M7.4 3.2c1.4-.7 2.5.1 3.5.5.7.3 1.5.3 2.2 0 1-.4 2.1-1.2 3.5-.5 1.7.8 2.5 2.8 2.1 5.1-.3 1.6-1.1 2.7-1.7 4-.7 1.4-.8 3.3-1.2 5.1-.4 1.7-1.1 3.4-2.5 3.4-1.1 0-1.4-1.2-1.7-2.6-.3-1.4-.7-2.9-1.6-2.9s-1.3 1.5-1.6 2.9c-.3 1.4-.6 2.6-1.7 2.6-1.4 0-2.1-1.7-2.5-3.4-.4-1.8-.5-3.7-1.2-5.1-.6-1.3-1.4-2.4-1.7-4-.4-2.3.4-4.3 2.1-5.1Z"/>`,
    home: `<path d="m3 11 9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>`,
    book: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z"/>`,
    file: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/>`,
    folder: `<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>`,
    circleHelp: `<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.6 1.5c-.9 1.3-2.7 1.7-2.7 3.5"/><path d="M12 18h.01"/>`,
    flame: `<path d="M8.5 14.5c0 2 1.6 3.5 3.5 3.5s3.5-1.5 3.5-3.5c0-1.7-.9-2.8-2-4.1-.8-.9-1.5-1.8-1.5-3.4-2 1.2-3.5 3.3-3.5 7.5Z"/><path d="M12 22a8 8 0 0 0 8-8c0-4.2-2.8-7.3-5.9-10.4C14 6.5 12.4 8 10.7 9.9 9.2 8.6 8.5 6.8 8.5 5 5.8 7 4 10.2 4 14a8 8 0 0 0 8 8Z"/>`,
    messages: `<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8"/><path d="M8 13h5"/>`,
    trophy: `<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4a3 3 0 0 0 3 3"/><path d="M17 6h3a3 3 0 0 1-3 3"/>`,
    barChart: `<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>`,
    bookmark: `<path d="M6 3h12a1 1 0 0 1 1 1v18l-7-4-7 4V4a1 1 0 0 1 1-1Z"/>`,
    search: `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>`,
    bell: `<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/>`,
    user: `<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>`,
    settings: `<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.3a2 2 0 1 1-4 0V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1A1.7 1.7 0 0 0 21 10h.3a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"/>`,
    logOut: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>`,
    menu: `<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>`,
    x: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
    sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`,
    moon: `<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z"/>`,
    mail: `<path d="M4 4h16v16H4Z"/><path d="m4 7 8 6 8-6"/>`,
    lock: `<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>`,
    eyeOff: `<path d="M3 3l18 18"/><path d="M10.6 10.6A2 2 0 0 0 13.4 13.4"/><path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6 0 9 8 9 8a15.5 15.5 0 0 1-2.1 3.2"/><path d="M6.6 6.6C4.2 8.2 3 12 3 12s3 8 9 8c1.6 0 3-.5 4.2-1.2"/>`,
    checkCircle: `<circle cx="12" cy="12" r="10"/><path d="m8 12 2.5 2.5L16 9"/>`,
    xCircle: `<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>`,
    clock: `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`,
    calendar: `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>`,
    layers: `<path d="m12 2 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>`,
    activity: `<path d="M22 12h-4l-3 8L9 4l-3 8H2"/>`,
    shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>`,
    clipboard: `<path d="M9 5h6"/><path d="M9 3h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1V5a2 2 0 0 1 2-2Z"/><path d="M8 13h8"/><path d="M8 17h5"/>`,
    target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
    award: `<circle cx="12" cy="8" r="6"/><path d="m9 13-2 8 5-3 5 3-2-8"/>`,
    save: `<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>`,
    flag: `<path d="M5 22V4"/><path d="M5 4h12l-1 5 1 5H5"/>`,
    plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`
  };
  if (name === "tooth") {
    return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none">${paths.tooth}</svg>`;
  }
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.circleHelp}</svg>`;
}
