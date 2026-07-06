export const materials = [
  ["Oral Anatomy", "oral-anatomy", "Tooth morphology, arches, nerve branches, and key landmarks.", "book-open"],
  ["Oral Histology", "oral-histology", "Enamel, dentin, pulp, periodontium, and developmental tissues.", "microscope"],
  ["Prosthodontics", "prosthodontics", "Impressions, occlusion, dentures, crowns, and treatment planning.", "sparkles"],
  ["Periodontology", "periodontology", "Gingiva, pocket charting, inflammation, and periodontal therapy.", "activity"],
  ["Endodontics", "endodontics", "Pulp disease, diagnosis, access cavities, irrigation, and obturation.", "target"],
  ["Local Anesthesia", "local-anesthesia", "Injection techniques, doses, nerves, complications, and safety.", "syringe"],
  ["Dental Materials", "dental-materials", "Cements, composites, impression materials, gypsum, and ceramics.", "layers"]
];

export const sheetBlueprints = {
  "oral-anatomy": ["Tooth morphology", "Dental arches", "Mandibular landmarks", "Maxillary landmarks", "Occlusion basics", "Nerve branches"],
  "oral-histology": ["Tooth development", "Enamel structure", "Dentin and pulp", "Cementum", "Periodontium", "Oral mucosa"],
  prosthodontics: ["Impressions", "Occlusion", "Complete dentures", "Partial dentures", "Crowns", "Treatment planning"],
  periodontology: ["Gingiva", "Periodontal ligament", "Pocket charting", "Inflammation", "Therapy planning", "Maintenance"],
  endodontics: ["Pulp diagnosis", "Access cavities", "Working length", "Irrigation", "Obturation", "Endodontic errors"],
  "local-anesthesia": ["Nerve anatomy", "Maxillary blocks", "Mandibular blocks", "Dose safety", "Complications", "Clinical scenarios"],
  "dental-materials": ["Composites", "Cements", "Impression materials", "Gypsum", "Ceramics", "Amalgam"]
};

export const questionBank = [
  {
    material: "oral-anatomy",
    prompt: "Which tissue forms the main bulk of the tooth?",
    choices: ["Enamel", "Dentin", "Cementum", "Pulp"],
    correct: "Dentin",
    explanation: "Dentin surrounds the pulp and forms most of the tooth structure.",
    difficulty: "Easy"
  },
  {
    material: "oral-anatomy",
    prompt: "The mandibular nerve exits the skull through which foramen?",
    choices: ["Foramen ovale", "Foramen rotundum", "Stylomastoid foramen", "Mental foramen"],
    correct: "Foramen ovale",
    explanation: "The mandibular division of the trigeminal nerve exits through the foramen ovale.",
    difficulty: "Medium"
  },
  {
    material: "oral-histology",
    prompt: "Which cells are responsible for enamel formation?",
    choices: ["Odontoblasts", "Ameloblasts", "Cementoblasts", "Fibroblasts"],
    correct: "Ameloblasts",
    explanation: "Ameloblasts produce enamel matrix during tooth development.",
    difficulty: "Easy"
  },
  {
    material: "prosthodontics",
    prompt: "Which material is commonly used for preliminary impressions?",
    choices: ["Alginate", "Zinc phosphate", "Composite resin", "Amalgam"],
    correct: "Alginate",
    explanation: "Alginate is a common irreversible hydrocolloid for preliminary impressions.",
    difficulty: "Easy"
  },
  {
    material: "periodontology",
    prompt: "What is the normal probing depth range for healthy gingiva?",
    choices: ["0-1 mm", "1-3 mm", "4-6 mm", "7-9 mm"],
    correct: "1-3 mm",
    explanation: "Healthy periodontal probing depths are generally within 1-3 mm.",
    difficulty: "Medium"
  },
  {
    material: "endodontics",
    prompt: "Which irrigant is widely used for dissolving organic tissue in root canals?",
    choices: ["Saline", "Sodium hypochlorite", "Distilled water", "Ethanol"],
    correct: "Sodium hypochlorite",
    explanation: "Sodium hypochlorite dissolves organic tissue and has antimicrobial activity.",
    difficulty: "Medium"
  },
  {
    material: "local-anesthesia",
    prompt: "Which nerve block is used to anesthetize mandibular molars?",
    choices: ["Infraorbital block", "Inferior alveolar nerve block", "Greater palatine block", "Nasopalatine block"],
    correct: "Inferior alveolar nerve block",
    explanation: "The inferior alveolar nerve block is commonly used for mandibular posterior teeth.",
    difficulty: "Easy"
  },
  {
    material: "dental-materials",
    prompt: "Which phase gives dental amalgam its major strength?",
    choices: ["Gamma", "Gamma-1", "Gamma-2", "Eta"],
    correct: "Gamma-1",
    explanation: "Gamma-1 is a strong silver-mercury phase in set amalgam.",
    difficulty: "Hard"
  }
];

export const defaultPlan = [
  ["09:00", "Oral Anatomy"],
  ["12:30", "Endodontics MCQ"],
  ["18:00", "Mistakes review"]
];

export const announcements = [
  {
    title: "Operative Dentistry sheet updated",
    body: "A cleaner caries preparation sheet is available for today's review block.",
    tone: "gold"
  },
  {
    title: "Exam room list tomorrow",
    body: "The final exam room list will be posted after the department confirms batches.",
    tone: "purple"
  },
  {
    title: "New prosthodontics summary added",
    body: "A concise impression materials summary was added for quick pre-lab reading.",
    tone: "green"
  }
];

export const communityPosts = [
  {
    authorEmail: "demo@dentify.local",
    tag: "Question",
    body: "Does anyone have a clean perio charting summary? I want something I can review before clinic.",
    likes: 18,
    replies: 5
  },
  {
    authorEmail: "demo@dentify.local",
    tag: "Resource",
    body: "I made a local anesthesia dose table with max doses and common blocks. Posting it after one more check.",
    likes: 24,
    replies: 7
  },
  {
    authorEmail: "demo@dentify.local",
    tag: "Study tip",
    body: "For oral anatomy, drawing each mandibular molar from memory helped more than rereading the notes.",
    likes: 31,
    replies: 4
  }
];

export const leaderboardEntries = [
  ["weekly", "Lina A.", "Weekly Champion", "186 solved", 4820, 94, 1],
  ["weekly", "Omar M.", "Second Place", "171 solved", 4510, 91, 2],
  ["weekly", "Sara K.", "Third Place", "164 solved", 4240, 89, 3],
  ["weekly", "Yousef N.", "Strong Finish", "152 solved", 3970, 87, 4],
  ["monthly", "Nour H.", "Monthly Champion", "620 solved", 12840, 92, 1],
  ["monthly", "Ali R.", "Second Place", "584 solved", 11920, 90, 2],
  ["monthly", "Maya S.", "Third Place", "558 solved", 11280, 88, 3],
  ["monthly", "Hiba F.", "Strong Finish", "531 solved", 10640, 86, 4],
  ["batch", "Rami H.", "Your Batch Rank", "Top 12%", 3680, 84, 12],
  ["material", "Lina A.", "Oral Anatomy", "98% anatomy", 2140, 98, 1],
  ["material", "Nour H.", "Endodontics", "96% endo", 2050, 96, 2],
  ["material", "Sara K.", "Periodontology", "94% perio", 1980, 94, 3],
  ["solver", "Nour H.", "Top Solver", "620 solved", 620, 92, 1],
  ["solver", "Ali R.", "Top Solver", "584 solved", 584, 90, 2],
  ["solver", "Maya S.", "Top Solver", "558 solved", 558, 88, 3],
  ["solver", "Hiba F.", "Top Solver", "531 solved", 531, 86, 4]
];

export const achievements = [
  ["Streak Badge", "Keep a 14 day study streak.", "activity", "streakDays", 14, 1],
  ["Ranking Badge", "Reach the top 12% in batch ranking.", "trophy", "rankedPoints", 3000, 2],
  ["Question Solver", "Solve your first 10 questions.", "help", "questionsSolved", 10, 3],
  ["Review Finisher", "Create five review items from weak answers.", "check", "reviewCount", 5, 4],
  ["Bookmark Keeper", "Save five learning items for later.", "bookmark", "savedItems", 5, 5],
  ["Material Explorer", "Open progress across all seven dental materials.", "book-open", "materialsCompleted", 7, 6]
];
