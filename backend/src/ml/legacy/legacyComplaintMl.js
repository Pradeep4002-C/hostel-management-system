const CATEGORY_ALIASES = {
  electrical: "electrical",
  plumbing: "plumbing",
  carpentry: "carpentry",
  carpenter: "carpentry",
  cleaning: "cleaning",
  cleaner: "cleaning",
};

const CATEGORY_KEYWORDS = {
  electrical: [
    "electric",
    "electrical",
    "wire",
    "wiring",
    "switch",
    "socket",
    "plug",
    "power",
    "electricity",
    "light",
    "bulb",
    "fan",
    "ac",
    "voltage",
  ],
  plumbing: [
    "plumbing",
    "tap",
    "pipe",
    "leak",
    "leakage",
    "water",
    "flush",
    "drain",
    "sink",
    "washroom",
    "toilet",
    "shower",
    "overflow",
  ],
  carpentry: [
    "door",
    "window",
    "bed",
    "table",
    "chair",
    "cupboard",
    "drawer",
    "wood",
    "lock",
    "hinge",
    "shelf",
    "furniture",
  ],
  cleaning: [
    "clean",
    "cleaning",
    "garbage",
    "dust",
    "smell",
    "dirty",
    "washroom dirty",
    "trash",
    "sweep",
    "mop",
    "stain",
    "hygiene",
  ],
};

const CRITICAL_KEYWORDS = [
  "sparking",
  "spark",
  "shock",
  "short circuit",
  "fire",
  "burning",
  "smoke",
  "gas leak",
  "flooding",
  "overflow",
  "ceiling leak",
  "urgent",
  "emergency",
];

const HIGH_KEYWORDS = [
  "leak",
  "water leakage",
  "power cut",
  "no electricity",
  "wire",
  "broken lock",
  "stuck door",
  "toilet blocked",
  "unsafe",
];

const MODERATE_KEYWORDS = [
  "fan",
  "light",
  "switch",
  "tap",
  "drain",
  "flush",
  "window",
  "bed",
  "table",
  "cleaning",
  "garbage",
  "washroom",
];

const CATEGORY_WEIGHTS = {
  electrical: 18,
  plumbing: 16,
  carpentry: 10,
  cleaning: 8,
};

function normalizeCategory(value) {
  if (!value) return null;
  return CATEGORY_ALIASES[String(value).toLowerCase()] || null;
}

function countMatches(text, keywords) {
  return keywords.reduce(
    (count, keyword) => count + (text.includes(keyword) ? 1 : 0),
    0,
  );
}

function containsKeyword(text, keywords) {
  return keywords.find((keyword) => text.includes(keyword));
}

function predictComplaintCategoryLegacy({ title, description, selectedCategory }) {
  const combinedText = `${title} ${description}`.toLowerCase();
  const normalizedSelectedCategory = normalizeCategory(selectedCategory);
  const scores = Object.entries(CATEGORY_KEYWORDS).map(
    ([category, keywords]) => ({
      category,
      score: countMatches(combinedText, keywords),
    }),
  );

  scores.sort((left, right) => right.score - left.score);
  const bestMatch = scores[0];

  if (!bestMatch || bestMatch.score === 0) {
    return normalizedSelectedCategory || "cleaning";
  }

  return bestMatch.category;
}

function scoreComplaintPriorityLegacy({
  title,
  description,
  category,
  student,
  openRoomComplaintCount = 0,
  openBlockComplaintCount = 0,
}) {
  const normalizedCategory = normalizeCategory(category) || "cleaning";
  const combinedText = `${title} ${description}`.toLowerCase();
  let score = 12;

  score += CATEGORY_WEIGHTS[normalizedCategory] ?? 8;

  if (containsKeyword(combinedText, CRITICAL_KEYWORDS)) {
    score += 40;
  }
  if (containsKeyword(combinedText, HIGH_KEYWORDS)) {
    score += 22;
  }
  if (!containsKeyword(combinedText, CRITICAL_KEYWORDS) && containsKeyword(combinedText, MODERATE_KEYWORDS)) {
    score += 10;
  }
  if (student?.roomNumber && openRoomComplaintCount > 0) {
    score += Math.min(18, openRoomComplaintCount * 6);
  }
  if (student?.hostelBlock && openBlockComplaintCount >= 2) {
    score += Math.min(15, openBlockComplaintCount * 3);
  }
  if (combinedText.length > 180) {
    score += 5;
  }

  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export {
  normalizeCategory,
  predictComplaintCategoryLegacy,
  scoreComplaintPriorityLegacy,
};
