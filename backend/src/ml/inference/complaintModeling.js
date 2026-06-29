import { complaintTrainingData } from "../data/complaintTrainingData.js";

const CATEGORY_ALIASES = {
  electrical: "electrical",
  electric: "electrical",
  electical: "electrical",
  electirc: "electrical",
  electricity: "electrical",
  plumbing: "plumbing",
  plumbng: "plumbing",
  pipe: "plumbing",
  leakage: "plumbing",
  carpentry: "carpentry",
  carpenter: "carpentry",
  woodwork: "carpentry",
  cleaning: "cleaning",
  cleaner: "cleaning",
  hygiene: "cleaning",
};

const TYPO_CORRECTIONS = {
  washrm: "washroom",
  washrrom: "washroom",
  leakng: "leaking",
  cupbrd: "cupboard",
  electirc: "electric",
  plumbng: "plumbing",
  commodee: "commode",
  dustbinn: "dustbin",
  sanitisation: "sanitization",
};

const CATEGORY_KEYWORDS = {
  electrical: [
    "fan",
    "switch",
    "socket",
    "plug",
    "power",
    "electric",
    "electricity",
    "light",
    "bulb",
    "mcb",
    "sparking",
    "short circuit",
    "burning smell",
    "spark",
    "smoke",
    "wire",
    "wiring",
    "lamp",
    "indicator",
    "heater",
    "ac",
    "geyser",
  ],
  plumbing: [
    "pipe",
    "leak",
    "water",
    "flush",
    "toilet",
    "drain",
    "sink",
    "tap",
    "washbasin",
    "washroom",
    "shower",
    "overflow",
    "ceiling leak",
    "seepage",
  ],
  carpentry: [
    "door",
    "window",
    "lock",
    "bed",
    "table",
    "chair",
    "cupboard",
    "drawer",
    "wood",
    "hinge",
    "shelf",
    "frame",
    "latch",
  ],
  cleaning: [
    "clean",
    "dirty",
    "dust",
    "garbage",
    "trash",
    "smell",
    "mold",
    "stain",
    "sanitize",
    "sanitization",
    "hygiene",
    "ants",
    "cobweb",
    "spider",
    "web",
    "spider web",
    "waste",
  ],
};

const PRIORITY_LEVELS = ["low", "medium", "high", "critical"];
const PRIORITY_SCORES = {
  low: 22,
  medium: 50,
  high: 76,
  critical: 94,
};

const HIGH_LOAD_STATUSES = ["pending", "assigned", "in_progress"];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "there",
  "have",
  "has",
  "into",
  "room",
  "hostel",
  "issue",
  "problem",
  "please",
  "need",
  "not",
  "very",
  "more",
  "just",
  "only",
  "near",
  "again",
]);

const CATEGORY_TUNING_GRID = [
  {
    alpha: 0.8,
    classWeightPower: 0.15,
    ensembleAlpha: 0.7,
    titleWeight: 1.5,
    descriptionWeight: 1,
    bigramWeight: 1.05,
    charWeight: 0.5,
    keywordWeight: 0.22,
    selectedCategoryBoost: 0.08,
  },
  {
    alpha: 1.1,
    classWeightPower: 0.25,
    ensembleAlpha: 0.65,
    titleWeight: 1.55,
    descriptionWeight: 1,
    bigramWeight: 1.1,
    charWeight: 0.6,
    keywordWeight: 0.24,
    selectedCategoryBoost: 0.08,
  },
  {
    alpha: 1.4,
    classWeightPower: 0.3,
    ensembleAlpha: 0.6,
    titleWeight: 1.45,
    descriptionWeight: 1.05,
    bigramWeight: 1.15,
    charWeight: 0.7,
    keywordWeight: 0.26,
    selectedCategoryBoost: 0.1,
  },
];

const PRIORITY_TUNING_GRID = [
  {
    alpha: 1,
    classWeightPower: 0.2,
    ensembleAlpha: 0.68,
    titleWeight: 1.35,
    descriptionWeight: 1,
    bigramWeight: 1.05,
    charWeight: 0.45,
    selectedCategoryBoost: 0.05,
  },
  {
    alpha: 1.25,
    classWeightPower: 0.3,
    ensembleAlpha: 0.62,
    titleWeight: 1.45,
    descriptionWeight: 1,
    bigramWeight: 1.1,
    charWeight: 0.55,
    selectedCategoryBoost: 0.06,
  },
  {
    alpha: 1.5,
    classWeightPower: 0.35,
    ensembleAlpha: 0.58,
    titleWeight: 1.5,
    descriptionWeight: 1.05,
    bigramWeight: 1.1,
    charWeight: 0.65,
    selectedCategoryBoost: 0.08,
  },
];
const DUPLICATE_THRESHOLD = 0.48;

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) return 0;
  const index = (sortedValues.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const fraction = index - lower;
  return (
    sortedValues[lower] * (1 - fraction) + sortedValues[upper] * fraction
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function softmaxScores(scoreEntries) {
  const maxScore = Math.max(...scoreEntries.map(([, score]) => score));
  const exps = scoreEntries.map(([label, score]) => [
    label,
    Math.exp(score - maxScore),
  ]);
  const total = exps.reduce((sum, [, score]) => sum + score, 0) || 1;
  return Object.fromEntries(exps.map(([label, score]) => [label, score / total]));
}

function normalizeCategory(value) {
  if (!value) return null;
  return CATEGORY_ALIASES[String(value).toLowerCase()] || null;
}

function normalizeText(rawText) {
  let text = String(rawText || "").toLowerCase();

  for (const [source, target] of Object.entries(TYPO_CORRECTIONS)) {
    text = text.replace(new RegExp(`\\b${source}\\b`, "g"), target);
  }

  return text
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function prepareTrainingDataset(examples) {
  const cleaned = [];
  const seen = new Set();
  const hours = examples
    .map((example) => example.estimatedResolutionHours)
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  const q1 = percentile(hours, 0.25);
  const q3 = percentile(hours, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - iqr * 1.5;
  const upperBound = q3 + iqr * 1.5;

  for (const example of examples) {
    const normalizedTitle = normalizeText(example.title);
    const normalizedDescription = normalizeText(example.description);
    const normalizedCategory =
      normalizeCategory(example.expectedCategory) ||
      normalizeCategory(example.selectedCategory);

    if (!normalizedTitle || !normalizedDescription || !normalizedCategory) {
      continue;
    }

    const dedupeKey = [
      normalizedTitle,
      normalizedDescription,
      normalizedCategory,
      example.priorityLabel,
    ].join("|");

    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    cleaned.push({
      ...example,
      title: normalizedTitle,
      description: normalizedDescription,
      selectedCategory:
        normalizeCategory(example.selectedCategory) || example.selectedCategory,
      expectedCategory: normalizedCategory,
      estimatedResolutionHours: clamp(
        example.estimatedResolutionHours,
        Math.max(2, lowerBound),
        upperBound || 24,
      ),
    });
  }

  return cleaned;
}

function tokenize(text) {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function buildCharFeatures(tokens) {
  const counts = new Map();

  for (const token of tokens) {
    if (token.length < 4) continue;

    for (let index = 0; index <= token.length - 3; index += 1) {
      const gram = token.slice(index, index + 3);
      counts.set(`ch:${gram}`, (counts.get(`ch:${gram}`) || 0) + 1);
    }
  }

  return counts;
}

function addWeightedFeatures(targetMap, tokens, weight, prefix = "") {
  for (const token of tokens) {
    const feature = `${prefix}${token}`;
    targetMap.set(feature, (targetMap.get(feature) || 0) + weight);
  }
}

function addBigrams(targetMap, tokens, weight) {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const feature = `bi:${tokens[index]}_${tokens[index + 1]}`;
    targetMap.set(feature, (targetMap.get(feature) || 0) + weight);
  }
}

function buildTextFeatureMap({
  title = "",
  description = "",
  selectedCategory = "",
  extraTokens = [],
  config,
}) {
  const titleTokens = tokenize(title);
  const descriptionTokens = tokenize(description);
  const featureMap = new Map();

  addWeightedFeatures(featureMap, titleTokens, config.titleWeight || 1.4, "w:");
  addWeightedFeatures(
    featureMap,
    descriptionTokens,
    config.descriptionWeight || 1,
    "w:",
  );
  addBigrams(featureMap, titleTokens, config.bigramWeight || 1.1);
  addBigrams(featureMap, descriptionTokens, config.bigramWeight || 1.1);

  if (config.charWeight > 0) {
    const charFeatures = buildCharFeatures([...titleTokens, ...descriptionTokens]);
    for (const [feature, count] of charFeatures.entries()) {
      featureMap.set(feature, (featureMap.get(feature) || 0) + count * config.charWeight);
    }
  }

  const normalizedSelectedCategory = normalizeCategory(selectedCategory);
  if (normalizedSelectedCategory) {
    featureMap.set(
      `selected:${normalizedSelectedCategory}`,
      config.selectedCategoryBoost || 0.08,
    );
  }

  addWeightedFeatures(featureMap, extraTokens, 1, "meta:");

  return { featureMap, titleTokens, descriptionTokens };
}

function computeKeywordScores(text) {
  const normalizedText = normalizeText(text);
  return Object.fromEntries(
    Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => [
      category,
      keywords.reduce(
        (score, keyword) =>
          score + (normalizedText.includes(keyword) ? 1 : 0),
        0,
      ),
    ]),
  );
}

function buildClassWeights(examples, labelKey) {
  const counts = new Map();

  for (const example of examples) {
    const label = example[labelKey];
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  const total = examples.length || 1;
  const classCount = counts.size || 1;
  const weights = new Map();

  for (const [label, count] of counts.entries()) {
    weights.set(label, total / (classCount * count));
  }

  return weights;
}

function trainNaiveBayesModel(examples, { labelKey, config, buildExtraTokens }) {
  const vocabulary = new Set();
  const labels = [...new Set(examples.map((item) => item[labelKey]))];
  const classWeights = buildClassWeights(examples, labelKey);
  const docsPerLabel = new Map();
  const featureTotals = new Map();
  const featureMassPerLabel = new Map();

  for (const label of labels) {
    docsPerLabel.set(label, 0);
    featureTotals.set(label, new Map());
    featureMassPerLabel.set(label, 0);
  }

  for (const example of examples) {
    const label = example[labelKey];
    docsPerLabel.set(label, docsPerLabel.get(label) + 1);

    const { featureMap } = buildTextFeatureMap({
      title: example.title,
      description: example.description,
      selectedCategory: example.selectedCategory,
      extraTokens: buildExtraTokens(example),
      config,
    });

    const targetMap = featureTotals.get(label);
    const weightMultiplier =
      Math.pow(classWeights.get(label) || 1, config.classWeightPower || 0);

    for (const [feature, value] of featureMap.entries()) {
      vocabulary.add(feature);
      targetMap.set(feature, (targetMap.get(feature) || 0) + value * weightMultiplier);
      featureMassPerLabel.set(
        label,
        featureMassPerLabel.get(label) + value * weightMultiplier,
      );
    }
  }

  const priors = new Map();
  const totalDocs = examples.length || 1;

  for (const label of labels) {
    const rawPrior = (docsPerLabel.get(label) || 1) / totalDocs;
    const balancedPrior =
      rawPrior *
      Math.pow(classWeights.get(label) || 1, config.classWeightPower || 0);
    priors.set(label, balancedPrior);
  }

  const priorTotal = [...priors.values()].reduce((sum, value) => sum + value, 0) || 1;
  for (const label of labels) {
    priors.set(label, (priors.get(label) || 1) / priorTotal);
  }

  return {
    type: "naive_bayes",
    labels,
    vocabulary: [...vocabulary],
    priors,
    featureTotals,
    featureMassPerLabel,
    config,
  };
}

function predictNaiveBayes(model, input, extraTokens = []) {
  const { featureMap } = buildTextFeatureMap({
    title: input.title,
    description: input.description,
    selectedCategory: input.selectedCategory,
    extraTokens,
    config: model.config,
  });

  const vocabSize = model.vocabulary.length || 1;
  const scoreEntries = model.labels.map((label) => {
    const alpha = model.config.alpha || 1;
    const featureTotals = model.featureTotals.get(label);
    const totalFeatureMass = model.featureMassPerLabel.get(label) || 1;
    let score = Math.log(model.priors.get(label) || 1e-9);

    for (const [feature, value] of featureMap.entries()) {
      const count = featureTotals.get(feature) || 0;
      const probability = (count + alpha) / (totalFeatureMass + alpha * vocabSize);
      score += value * Math.log(probability);
    }

    return [label, score];
  });

  const probabilities = softmaxScores(scoreEntries);
  const best = [...scoreEntries].sort((left, right) => right[1] - left[1])[0];

  return {
    label: best[0],
    probabilities,
    rawScores: Object.fromEntries(scoreEntries),
    featureMap,
  };
}

function buildCentroidModel(examples, { labelKey, config, buildExtraTokens }) {
  const documentFeatures = [];
  const documentFrequency = new Map();

  for (const example of examples) {
    const { featureMap } = buildTextFeatureMap({
      title: example.title,
      description: example.description,
      selectedCategory: example.selectedCategory,
      extraTokens: buildExtraTokens(example),
      config,
    });

    documentFeatures.push({ label: example[labelKey], featureMap });

    for (const feature of featureMap.keys()) {
      documentFrequency.set(feature, (documentFrequency.get(feature) || 0) + 1);
    }
  }

  const idf = new Map();
  const totalDocs = documentFeatures.length || 1;

  for (const [feature, count] of documentFrequency.entries()) {
    idf.set(feature, Math.log((1 + totalDocs) / (1 + count)) + 1);
  }

  const centroids = new Map();
  const counts = new Map();

  for (const { label, featureMap } of documentFeatures) {
    if (!centroids.has(label)) {
      centroids.set(label, new Map());
      counts.set(label, 0);
    }

    counts.set(label, counts.get(label) + 1);
    const centroid = centroids.get(label);

    for (const [feature, value] of featureMap.entries()) {
      const weightedValue = value * (idf.get(feature) || 1);
      centroid.set(feature, (centroid.get(feature) || 0) + weightedValue);
    }
  }

  for (const [label, centroid] of centroids.entries()) {
    const count = counts.get(label) || 1;
    for (const [feature, value] of centroid.entries()) {
      centroid.set(feature, value / count);
    }
  }

  return {
    type: "centroid",
    labels: [...centroids.keys()],
    centroids,
    idf,
    config,
  };
}

function computeVectorMagnitude(featureMap) {
  let total = 0;
  for (const value of featureMap.values()) {
    total += value * value;
  }
  return Math.sqrt(total) || 1;
}

function predictCentroidModel(model, input, extraTokens = []) {
  const { featureMap } = buildTextFeatureMap({
    title: input.title,
    description: input.description,
    selectedCategory: input.selectedCategory,
    extraTokens,
    config: model.config,
  });

  const weightedVector = new Map();
  for (const [feature, value] of featureMap.entries()) {
    weightedVector.set(feature, value * (model.idf.get(feature) || 1));
  }

  const vectorMagnitude = computeVectorMagnitude(weightedVector);
  const scoreEntries = model.labels.map((label) => {
    const centroid = model.centroids.get(label);
    const centroidMagnitude = computeVectorMagnitude(centroid);
    let dotProduct = 0;

    for (const [feature, value] of weightedVector.entries()) {
      dotProduct += value * (centroid.get(feature) || 0);
    }

    return [label, dotProduct / (vectorMagnitude * centroidMagnitude)];
  });

  const probabilities = softmaxScores(scoreEntries);
  const best = [...scoreEntries].sort((left, right) => right[1] - left[1])[0];

  return {
    label: best[0],
    probabilities,
    rawScores: Object.fromEntries(scoreEntries),
    featureMap: weightedVector,
  };
}

function buildCategoryExtraTokens(example) {
  return [
    example.expectedCategory ? `target:${example.expectedCategory}` : null,
  ].filter(Boolean);
}

function buildPriorityExtraTokens(example) {
  const tokens = [];
  const category = normalizeCategory(example.expectedCategory || example.selectedCategory);
  if (category) {
    tokens.push(`category:${category}`);
  }

  const normalizedText = normalizeText(`${example.title} ${example.description}`);
  if (/\b(spark|sparks|sparking|smoke|fire|shock|overflow|overflowing|flood|unsafe|burning|short circuit|choked)\b/.test(normalizedText)) {
    tokens.push("severity:critical");
  }
  if (/\b(leak|blocked|broken|stuck|no power|dark)\b/.test(normalizedText)) {
    tokens.push("severity:high");
  }
  if (normalizedText.length > 110) {
    tokens.push("detail:long");
  }

  return tokens;
}

function mergeProbabilities(primary, secondary, ensembleAlpha, keywordBias = {}) {
  const labels = new Set([
    ...Object.keys(primary),
    ...Object.keys(secondary),
    ...Object.keys(keywordBias),
  ]);

  const scores = [];
  for (const label of labels) {
    const score =
      ensembleAlpha * (primary[label] || 0) +
      (1 - ensembleAlpha) * (secondary[label] || 0) +
      (keywordBias[label] || 0);
    scores.push([label, score]);
  }

  return softmaxScores(scores);
}

function trainHybridClassifier(examples, options) {
  const nbModel = trainNaiveBayesModel(examples, options);
  const centroidModel = buildCentroidModel(examples, options);

  return {
    type: "hybrid_classifier",
    nbModel,
    centroidModel,
    labelKey: options.labelKey,
    config: options.config,
    buildExtraTokens: options.buildExtraTokens,
  };
}

function predictHybridClassifier(model, input, { keywordScores = null, extraTokens = [] } = {}) {
  const nbPrediction = predictNaiveBayes(model.nbModel, input, extraTokens);
  const centroidPrediction = predictCentroidModel(model.centroidModel, input, extraTokens);
  const keywordBias = {};

  if (keywordScores) {
    for (const [label, score] of Object.entries(keywordScores)) {
      keywordBias[label] = score * (model.config.keywordWeight || 0);
    }
  }

  const probabilities = mergeProbabilities(
    nbPrediction.probabilities,
    centroidPrediction.probabilities,
    model.config.ensembleAlpha || 0.65,
    keywordBias,
  );

  const ranked = Object.entries(probabilities).sort((left, right) => right[1] - left[1]);
  const [bestLabel, bestScore] = ranked[0];
  const secondScore = ranked[1]?.[1] || 0;

  return {
    label: bestLabel,
    confidence: clamp(bestScore * (1 + (bestScore - secondScore)), 0, 0.99),
    probabilities,
    nbPrediction,
    centroidPrediction,
  };
}

function getClassificationMetrics(truth, predictions, labels) {
  const confusion = Object.fromEntries(
    labels.map((label) => [label, Object.fromEntries(labels.map((inner) => [inner, 0]))]),
  );

  truth.forEach((label, index) => {
    const predicted = predictions[index];
    confusion[label][predicted] += 1;
  });

  let correct = 0;
  let precisionSum = 0;
  let recallSum = 0;
  let f1Sum = 0;

  for (const label of labels) {
    const tp = confusion[label][label];
    const fp = labels.reduce(
      (sum, rowLabel) => sum + (rowLabel === label ? 0 : confusion[rowLabel][label]),
      0,
    );
    const fn = labels.reduce(
      (sum, colLabel) => sum + (colLabel === label ? 0 : confusion[label][colLabel]),
      0,
    );

    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

    precisionSum += precision;
    recallSum += recall;
    f1Sum += f1;
    correct += tp;
  }

  return {
    accuracy: correct / truth.length,
    precision: precisionSum / labels.length,
    recall: recallSum / labels.length,
    f1: f1Sum / labels.length,
    confusion,
  };
}

function buildStratifiedFolds(examples, labelKey, foldCount = 5) {
  const labelBuckets = new Map();

  for (const example of examples) {
    const label = example[labelKey];
    if (!labelBuckets.has(label)) {
      labelBuckets.set(label, []);
    }
    labelBuckets.get(label).push(example);
  }

  const folds = Array.from({ length: foldCount }, () => []);
  for (const bucket of labelBuckets.values()) {
    bucket.forEach((example, index) => {
      folds[index % foldCount].push(example);
    });
  }

  return folds;
}

function crossValidateClassifier({
  examples,
  labelKey,
  labels,
  config,
  buildExtraTokens,
}) {
  const folds = buildStratifiedFolds(examples, labelKey, 5);
  const truth = [];
  const predictions = [];

  for (let index = 0; index < folds.length; index += 1) {
    const validationSet = folds[index];
    const trainingSet = folds.flatMap((fold, foldIndex) =>
      foldIndex === index ? [] : fold,
    );

    const model = trainHybridClassifier(trainingSet, {
      labelKey,
      config,
      buildExtraTokens,
    });

    for (const example of validationSet) {
      const keywordScores =
        labelKey === "expectedCategory"
          ? computeKeywordScores(`${example.title} ${example.description}`)
          : null;

      const prediction = predictHybridClassifier(model, example, {
        keywordScores,
        extraTokens: buildExtraTokens(example),
      });

      truth.push(example[labelKey]);
      predictions.push(prediction.label);
    }
  }

  return getClassificationMetrics(truth, predictions, labels);
}

function pickBestConfig(examples, labelKey, labels, configGrid, buildExtraTokens) {
  let best = null;

  for (const config of configGrid) {
    const metrics = crossValidateClassifier({
      examples,
      labelKey,
      labels,
      config,
      buildExtraTokens,
    });

    if (!best || metrics.f1 > best.metrics.f1) {
      best = { config, metrics };
    }
  }

  return best;
}

const preparedTrainingData = prepareTrainingDataset(complaintTrainingData);

const tunedCategoryConfig = pickBestConfig(
  preparedTrainingData,
  "expectedCategory",
  ["electrical", "plumbing", "carpentry", "cleaning"],
  CATEGORY_TUNING_GRID,
  buildCategoryExtraTokens,
);

const tunedPriorityConfig = pickBestConfig(
  preparedTrainingData,
  "priorityLabel",
  PRIORITY_LEVELS,
  PRIORITY_TUNING_GRID,
  buildPriorityExtraTokens,
);

const categoryModel = trainHybridClassifier(preparedTrainingData, {
  labelKey: "expectedCategory",
  config: tunedCategoryConfig.config,
  buildExtraTokens: buildCategoryExtraTokens,
});

const priorityModel = trainHybridClassifier(preparedTrainingData, {
  labelKey: "priorityLabel",
  config: tunedPriorityConfig.config,
  buildExtraTokens: buildPriorityExtraTokens,
});

function getTopReason(probabilities, label, keywordScores) {
  const keywordEntries = Object.entries(keywordScores || {}).sort(
    (left, right) => right[1] - left[1],
  );

  if (keywordEntries[0]?.[1] > 0 && keywordEntries[0][0] === label) {
    return `Detected multiple ${label} keywords in the complaint text`;
  }

  const confidence = Math.round((probabilities[label] || 0) * 100);
  return `Model confidence favors ${label} with ${confidence}% probability`;
}

function predictComplaintCategoryModel(input) {
  const keywordScores = computeKeywordScores(`${input.title} ${input.description}`);
  const rankedKeywordScores = Object.entries(keywordScores).sort(
    (left, right) => right[1] - left[1],
  );
  const prediction = predictHybridClassifier(categoryModel, input, {
    keywordScores,
    extraTokens: buildCategoryExtraTokens({
      ...input,
      expectedCategory: normalizeCategory(input.selectedCategory),
    }),
  });

  const strongestKeywordLabel = rankedKeywordScores[0]?.[0];
  const strongestKeywordScore = rankedKeywordScores[0]?.[1] || 0;
  const secondKeywordScore = rankedKeywordScores[1]?.[1] || 0;
  const shouldTrustRuleSignal =
    strongestKeywordScore > 0 &&
    (strongestKeywordScore >= 2 || strongestKeywordScore > secondKeywordScore);
  const predictedCategory = shouldTrustRuleSignal
    ? strongestKeywordLabel
    : prediction.label;
  const confidence = shouldTrustRuleSignal
    ? clamp(
        0.62 +
          strongestKeywordScore * 0.08 +
          (strongestKeywordScore - secondKeywordScore) * 0.05,
        0.62,
        0.97,
      )
    : prediction.confidence;

  return {
    predictedCategory,
    categoryPredictionConfidence: Number(confidence.toFixed(2)),
    categoryPredictionReasons: [
      shouldTrustRuleSignal
        ? `Strong domain keyword signal points to ${predictedCategory}`
        : getTopReason(prediction.probabilities, prediction.label, keywordScores),
      normalizeCategory(input.selectedCategory) &&
      normalizeCategory(input.selectedCategory) !== predictedCategory
        ? `Selected category "${input.selectedCategory}" conflicts with the text signal`
        : "Selected category aligns with the language in the complaint",
    ].filter(Boolean),
    categoryMismatch:
      Boolean(normalizeCategory(input.selectedCategory)) &&
      normalizeCategory(input.selectedCategory) !== predictedCategory &&
      confidence >= 0.63,
    categoryModelVersion: "category-stacked-v3",
  };
}

function getPriorityContextTokens({
  category,
  openRoomComplaintCount = 0,
  openBlockComplaintCount = 0,
  hasImage = false,
}) {
  const tokens = [];
  const normalizedCategory = normalizeCategory(category);

  if (normalizedCategory) {
    tokens.push(`category:${normalizedCategory}`);
  }
  if (openRoomComplaintCount >= 2) {
    tokens.push("repeat:room-high");
  } else if (openRoomComplaintCount >= 1) {
    tokens.push("repeat:room");
  }
  if (openBlockComplaintCount >= 4) {
    tokens.push("repeat:block-high");
  } else if (openBlockComplaintCount >= 2) {
    tokens.push("repeat:block");
  }
  if (hasImage) {
    tokens.push("evidence:image");
  }

  return tokens;
}

function predictPriorityModel(input) {
  const normalizedCategory = normalizeCategory(input.category) || "cleaning";
  const combinedText = `${input.title} ${input.description}`;
  const normalizedText = normalizeText(combinedText);
  const keywordScores = {
    low: /\b(cobweb|dust|minor|small|flicker)\b/.test(normalizedText) ? 0.7 : 0.1,
    medium: /\b(loose|dirty|drip|not working|delay)\b/.test(normalizedText) ? 0.8 : 0.2,
    high: /\b(leak|blocked|broken|unsafe|dark|no electricity)\b/.test(normalizedText) ? 0.9 : 0.2,
    critical: /\b(spark|sparks|sparking|smoke|fire|shock|overflow|overflowing|flood|burning|short circuit|choked)\b/.test(normalizedText) ? 1.1 : 0.1,
  };

  const contextTokens = getPriorityContextTokens({
    category: normalizedCategory,
    openRoomComplaintCount: input.openRoomComplaintCount,
    openBlockComplaintCount: input.openBlockComplaintCount,
    hasImage: input.hasImage,
  });

  const prediction = predictHybridClassifier(priorityModel, input, {
    keywordScores,
    extraTokens: [...buildPriorityExtraTokens(input), ...contextTokens],
  });
  const hasCriticalSignal =
    /\b(spark|sparks|sparking|smoke|fire|shock|overflow|overflowing|flood|burning|short circuit|choked)\b/.test(normalizedText);
  const hasHighSignal =
    /\b(leak|blocked|broken|unsafe|dark|no electricity|trip|jammed)\b/.test(
      normalizedText,
    );
  const hasLowSignal =
    /\b(cobweb|dust|minor|small|flicker|delay)\b/.test(normalizedText);
  let calibratedLabel = prediction.label;

  if (calibratedLabel === "critical" && !hasCriticalSignal) {
    calibratedLabel = hasHighSignal ? "high" : "medium";
  } else if (calibratedLabel === "high" && !hasHighSignal && hasLowSignal) {
    calibratedLabel = "medium";
  } else if (calibratedLabel === "medium" && hasCriticalSignal) {
    calibratedLabel = "critical";
  } else if (calibratedLabel === "medium" && hasHighSignal) {
    calibratedLabel = "high";
  } else if (calibratedLabel === "low" && hasHighSignal) {
    calibratedLabel = "medium";
  }

  const ordered = Object.entries(prediction.probabilities).sort(
    (left, right) => right[1] - left[1],
  );
  const topReasons = [
    `Posterior probability is highest for ${prediction.label}`,
  ];

  if (input.openRoomComplaintCount > 0) {
    topReasons.push(
      `Same room already has ${input.openRoomComplaintCount} active complaint${input.openRoomComplaintCount > 1 ? "s" : ""}`,
    );
  }
  if (input.openBlockComplaintCount >= 2) {
    topReasons.push(
      `Hostel block currently has ${input.openBlockComplaintCount} active related complaints`,
    );
  }
  if (ordered[0]?.[0] === "critical") {
    topReasons.push("Emergency terms were detected in the complaint text");
  }

  return {
    priorityScore: PRIORITY_SCORES[calibratedLabel],
    priorityLabel: calibratedLabel,
    priorityConfidence: Number(
      clamp(
        prediction.confidence - (calibratedLabel !== prediction.label ? 0.05 : 0),
        0.4,
        0.98,
      ).toFixed(2),
    ),
    priorityReasons: topReasons.slice(0, 3),
    priorityModelVersion: "priority-hybrid-v3",
  };
}

function vectorizeForDuplicate(text) {
  const tokens = tokenize(text);
  const features = new Map();

  addWeightedFeatures(features, tokens, 1.2, "w:");
  addBigrams(features, tokens, 1.3);
  const charFeatures = buildCharFeatures(tokens);
  for (const [feature, count] of charFeatures.entries()) {
    features.set(feature, (features.get(feature) || 0) + count * 0.45);
  }

  return features;
}

function cosineSimilarity(leftMap, rightMap) {
  let dotProduct = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (const value of leftMap.values()) {
    leftNorm += value * value;
  }
  for (const value of rightMap.values()) {
    rightNorm += value * value;
  }

  for (const [feature, value] of leftMap.entries()) {
    dotProduct += value * (rightMap.get(feature) || 0);
  }

  return dotProduct / ((Math.sqrt(leftNorm) || 1) * (Math.sqrt(rightNorm) || 1));
}

function detectDuplicateSignal({
  incomingComplaint,
  existingComplaints,
  student,
  threshold = DUPLICATE_THRESHOLD,
}) {
  const incomingCategory =
    normalizeCategory(incomingComplaint.predictedCategory) ||
    normalizeCategory(incomingComplaint.category);
  const incomingVector = vectorizeForDuplicate(
    `${incomingComplaint.title} ${incomingComplaint.description}`,
  );

  const candidates = existingComplaints
    .map((complaint) => {
      const candidateCategory =
        normalizeCategory(complaint.predictedCategory) ||
        normalizeCategory(complaint.category);
      let score = cosineSimilarity(
        incomingVector,
        vectorizeForDuplicate(`${complaint.title} ${complaint.description}`),
      );
      const reasons = [];

      if (incomingCategory && candidateCategory === incomingCategory) {
        score += 0.17;
        reasons.push(`Same predicted category: ${incomingCategory}`);
      }
      if (
        student?.hostelBlock &&
        complaint.student?.hostelBlock === student.hostelBlock
      ) {
        score += 0.12;
        reasons.push(`Same hostel block: ${student.hostelBlock}`);
      }
      if (
        student?.roomNumber &&
        complaint.student?.roomNumber === student.roomNumber
      ) {
        score += 0.18;
        reasons.push(`Same room number: ${student.roomNumber}`);
      }
      if (
        normalizeText(incomingComplaint.title) === normalizeText(complaint.title)
      ) {
        score += 0.15;
        reasons.push("Exact complaint title match");
      }

      return {
        complaint,
        score: Number(clamp(score, 0, 0.99).toFixed(2)),
        reasons,
      };
    })
    .sort((left, right) => right.score - left.score);

  const best = candidates[0];
  if (!best || best.score < threshold) {
    return {
      duplicateCandidate: false,
      duplicateOf: null,
      duplicateMatchScore: best?.score || 0,
      duplicateReasons: [],
      duplicateModelVersion: "duplicate-cosine-v3",
    };
  }

  return {
    duplicateCandidate: true,
    duplicateOf: best.complaint._id,
    duplicateMatchScore: best.score,
    duplicateReasons: best.reasons.length
      ? best.reasons
      : ["Text similarity strongly matches an active complaint"],
    duplicateModelVersion: "duplicate-cosine-v3",
  };
}

function buildResolutionProfile() {
  const grouped = new Map();

  for (const example of preparedTrainingData) {
    const key = `${example.expectedCategory}:${example.priorityLabel}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(example.estimatedResolutionHours);
  }

  const profile = new Map();
  for (const [key, values] of grouped.entries()) {
    const sorted = [...values].sort((left, right) => left - right);
    const median = sorted[Math.floor(sorted.length / 2)];
    profile.set(key, {
      median,
      support: values.length,
    });
  }

  return profile;
}

const resolutionProfile = buildResolutionProfile();

function resolutionRangeFromHours(hours) {
  if (hours <= 6) return "Within 6 hours";
  if (hours <= 12) return "Same day";
  if (hours <= 24) return "Within 24 hours";
  if (hours <= 48) return "Within 2 days";
  return "More than 2 days";
}

function resolutionLabelFromHours(hours, priorityLabel) {
  if (priorityLabel === "critical" && hours > 12) {
    return "critical_watch";
  }
  if (hours <= 6) return "quick";
  if (hours <= 24) return "standard";
  return "slow";
}

function estimateResolutionModel({
  category,
  priorityLabel,
  duplicateCandidate = false,
  openRoomComplaintCount = 0,
  openBlockComplaintCount = 0,
  workerLoad = 0,
  hasImage = false,
}) {
  const normalizedCategory = normalizeCategory(category) || "cleaning";
  const profile =
    resolutionProfile.get(`${normalizedCategory}:${priorityLabel}`) ||
    resolutionProfile.get(`${normalizedCategory}:medium`) || {
      median: 10,
      support: 1,
    };
  let estimatedHours = profile.median;
  const reasons = [
    `${normalizedCategory} + ${priorityLabel} complaints historically center around ${profile.median} hours`,
  ];

  if (duplicateCandidate) {
    estimatedHours -= 0.7;
    reasons.push("Duplicate signal can reduce diagnosis time");
  }
  if (openRoomComplaintCount > 0) {
    estimatedHours += Math.min(5, openRoomComplaintCount * 1.2);
    reasons.push("Repeated room issues increase inspection complexity");
  }
  if (openBlockComplaintCount >= 3) {
    estimatedHours += Math.min(7, openBlockComplaintCount * 0.7);
    reasons.push("Higher complaint density in the block may slow resolution");
  }
  if (workerLoad > 0) {
    estimatedHours += Math.min(10, workerLoad * 2.1);
    reasons.push(`Assigned worker currently has ${workerLoad} active task${workerLoad === 1 ? "" : "s"}`);
  }
  if (hasImage) {
    estimatedHours -= 0.5;
    reasons.push("Image evidence helps workers prepare before arriving");
  }

  const roundedHours = Number(clamp(Number(estimatedHours.toFixed(1)), 2, 72));
  const confidenceBase = 0.55 + Math.min(0.18, profile.support * 0.03);
  const confidencePenalty =
    Math.min(0.16, workerLoad * 0.03) + (duplicateCandidate ? 0 : 0.03);
  const resolutionConfidence = clamp(
    Number((confidenceBase - confidencePenalty).toFixed(2)),
    0.4,
    0.95,
  );

  return {
    estimatedResolutionHours: roundedHours,
    estimatedResolutionRange: resolutionRangeFromHours(roundedHours),
    resolutionEtaLabel: resolutionLabelFromHours(roundedHours, priorityLabel),
    resolutionConfidence,
    resolutionReasons: reasons.slice(0, 3),
    resolutionModelVersion: "resolution-calibrated-v2",
  };
}

function recommendWorkersModel({ complaint, workers, workerLoadMap }) {
  const targetCategory =
    normalizeCategory(complaint.predictedCategory) ||
    normalizeCategory(complaint.category);

  return workers
    .map((worker) => {
      const normalizedWorkerType = normalizeCategory(worker.workerType);
      const activeAssignments = workerLoadMap[worker._id.toString()] || 0;
      const reasons = [];
      let score = 0.2;

      if (normalizedWorkerType === targetCategory) {
        score += 0.48;
        reasons.push(`Skill match for ${targetCategory}`);
      } else if (!targetCategory) {
        score += 0.18;
        reasons.push("Weak category signal, ranking mainly by availability");
      } else {
        score += 0.08;
        reasons.push("Fallback assignment based on availability");
      }

      score += Math.max(0, 0.28 - activeAssignments * 0.08);
      reasons.push(`${activeAssignments} active assigned complaint${activeAssignments === 1 ? "" : "s"}`);

      if (["high", "critical"].includes(complaint.priorityLabel) && activeAssignments === 0) {
        score += 0.12;
        reasons.push("Free to handle a higher-priority issue immediately");
      }

      const recommendationConfidence = clamp(score, 0.35, 0.97);

      return {
        _id: worker._id,
        name: worker.name,
        workerType: worker.workerType,
        normalizedWorkerType,
        recommendationScore: Math.round(recommendationConfidence * 100),
        recommendationConfidence: Number(recommendationConfidence.toFixed(2)),
        activeAssignments,
        recommendationReasons: reasons.slice(0, 3),
      };
    })
    .sort((left, right) => right.recommendationScore - left.recommendationScore)
    .slice(0, 3);
}

export {
  HIGH_LOAD_STATUSES,
  PRIORITY_LEVELS,
  buildCategoryExtraTokens,
  buildPriorityExtraTokens,
  complaintTrainingData,
  preparedTrainingData,
  computeKeywordScores,
  crossValidateClassifier,
  DUPLICATE_THRESHOLD,
  detectDuplicateSignal,
  estimateResolutionModel,
  normalizeCategory,
  pickBestConfig,
  predictComplaintCategoryModel,
  predictHybridClassifier,
  predictPriorityModel,
  recommendWorkersModel,
  trainHybridClassifier,
  tunedCategoryConfig,
  tunedPriorityConfig,
};
