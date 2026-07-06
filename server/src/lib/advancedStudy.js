export const difficultyConfig = {
  easy: { label: "Easy", questionCount: 5, xpPerCorrect: 10, bonusXp: 25 },
  medium: { label: "Medium", questionCount: 7, xpPerCorrect: 15, bonusXp: 45 },
  hard: { label: "Hard", questionCount: 10, xpPerCorrect: 25, bonusXp: 75 }
};

const typePattern = {
  easy: ["mcq", "true_false", "mcq", "true_false", "mcq"],
  medium: ["mcq", "true_false", "understanding", "mcq", "true_false", "understanding", "mcq"],
  hard: ["mcq", "true_false", "analytical", "mcq", "understanding", "analytical", "mcq", "true_false", "understanding", "analytical"]
};

export function normalizeDifficulty(value) {
  const difficulty = String(value || "").toLowerCase();
  return difficultyConfig[difficulty] ? difficulty : "easy";
}

export function getMasteryStatus(averageScore) {
  if (averageScore >= 80) return "Mastered";
  if (averageScore >= 60) return "In progress";
  return "Not mastered";
}

export function getPageBlock(unlockedPages, totalPages) {
  const end = Math.min(Math.max(unlockedPages, 3), totalPages);
  const start = Math.max(1, end - 2);
  return { pageStart: start, pageEnd: end };
}

export function buildSheetPages(sheet, pageStart = 1, pageEnd = sheet.total_pages) {
  const pages = [];
  for (let page = pageStart; page <= pageEnd; page += 1) {
    pages.push({
      page,
      title: `${sheet.title} - Page ${page}`,
      topic: pageTopic(sheet, page),
      body: [
        `${pageTopic(sheet, page)} placeholder explanation for ${sheet.material_title}.`,
        "This structural page stands in for the real sheet content until the final files are attached.",
        "Study the core idea, compare it with the previous page, then continue to the checkpoint quiz."
      ]
    });
  }
  return pages;
}

export function buildPlaceholderQuiz({ sheet, difficulty, pageStart, pageEnd, variant = 0, isFinal = false }) {
  const config = difficultyConfig[difficultyConfig[difficulty] ? difficulty : "easy"];
  const count = isFinal ? config.questionCount : config.questionCount;
  return Array.from({ length: count }, (_, index) => {
    const page = isFinal
      ? ((index + variant) % sheet.total_pages) + 1
      : pageStart + ((index + variant) % Math.max(1, pageEnd - pageStart + 1));
    const type = typePattern[difficulty][index % typePattern[difficulty].length];
    const topic = pageTopic(sheet, page);
    const id = `${difficulty}-${isFinal ? "final" : `${pageStart}-${pageEnd}`}-${variant}-${index}`;
    const closeOption = difficulty === "hard" ? "A nearby but incomplete explanation" : "A related idea from another page";
    const question = {
      id,
      type,
      topic,
      page,
      prompt: promptForType(type, topic, page, isFinal),
      explanation: `Placeholder explanation: review ${topic} on page ${page} and connect it to the current sheet objective.`
    };

    if (type === "true_false") {
      return { ...question, choices: ["True", "False"], correctAnswer: index % 2 === 0 ? "True" : "False" };
    }

    const correctAnswer = `Core idea of ${topic}`;
    return {
      ...question,
      choices: [
        correctAnswer,
        closeOption,
        `A detail from page ${Math.max(1, page - 1)}`,
        `A detail from page ${Math.min(sheet.total_pages, page + 1)}`
      ].sort((a, b) => rotateSort(a, b, index + variant)),
      correctAnswer
    };
  });
}

export function scoreQuiz({ questions, answers, difficulty }) {
  const answerMap = new Map((answers || []).map((answer) => [answer.questionId, answer.selectedAnswer]));
  const reviewed = questions.map((question) => {
    const selectedAnswer = answerMap.get(question.id) || "";
    const isCorrect = selectedAnswer === question.correctAnswer;
    return {
      questionId: question.id,
      question: question.prompt,
      topic: question.topic,
      page: question.page,
      userAnswer: selectedAnswer || "No answer",
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      isCorrect
    };
  });
  const correctCount = reviewed.filter((item) => item.isCorrect).length;
  const questionCount = questions.length;
  const score = questionCount ? Math.round((correctCount / questionCount) * 100) : 0;
  const config = difficultyConfig[difficulty];
  const xpAwarded = correctCount * config.xpPerCorrect + (score >= 90 ? config.bonusXp : 0);
  const wrongItems = reviewed.filter((item) => !item.isCorrect);
  const weakPoints = [...new Set(wrongItems.map((item) => item.topic))];
  return { score, correctCount, questionCount, xpAwarded, reviewed, wrongItems, weakPoints };
}

export function resultMessage(score, isFinal = false) {
  if (isFinal && score >= 80) return "Final Boss cleared. This sheet is mastered.";
  if (isFinal) return "Final Boss needs another run. Review weak points and retry.";
  if (score >= 90) return "Excellent. Next 3 pages unlocked with bonus XP.";
  if (score >= 70) return "Good work. Next 3 pages unlocked. Needs light review.";
  if (score >= 50) return "You can continue, but this block needs review.";
  return "Score below 50%. Retake is required before unlocking more pages.";
}

function pageTopic(sheet, page) {
  const base = sheet.title.replace(/^Sheet \d+:\s*/, "");
  return `${base} concept ${page}`;
}

function promptForType(type, topic, page, isFinal) {
  const scope = isFinal ? "final review" : `page ${page}`;
  if (type === "true_false") return `True or False: ${topic} is a key idea in the ${scope} block.`;
  if (type === "understanding") return `Which option best connects ${topic} with the current 3-page block?`;
  if (type === "analytical") return `A patient scenario depends on ${topic}. Which answer shows the strongest understanding?`;
  return `What is the main placeholder idea for ${topic}?`;
}

function rotateSort(a, b, seed) {
  return ((a.length + seed) % 7) - ((b.length + seed) % 7);
}
