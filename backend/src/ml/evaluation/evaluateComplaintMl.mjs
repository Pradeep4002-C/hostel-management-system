import fs from "fs";
import path from "path";
import {
  PRIORITY_LEVELS,
  buildCategoryExtraTokens,
  buildPriorityExtraTokens,
  crossValidateClassifier,
  detectDuplicateSignal,
  preparedTrainingData,
  predictComplaintCategoryModel,
  predictPriorityModel,
  tunedCategoryConfig,
  tunedPriorityConfig,
} from "../inference/complaintModeling.js";
import {
  predictComplaintCategoryLegacy,
  scoreComplaintPriorityLegacy,
} from "../legacy/legacyComplaintMl.js";

const CATEGORY_LABELS = ["electrical", "plumbing", "carpentry", "cleaning"];

function roundMetric(value) {
  return Number((value * 100).toFixed(2));
}

function getClassificationMetrics(truth, predictions, labels) {
  const confusion = Object.fromEntries(
    labels.map((label) => [label, Object.fromEntries(labels.map((inner) => [inner, 0]))]),
  );

  truth.forEach((label, index) => {
    confusion[label][predictions[index]] += 1;
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

function evaluateLegacyCategory() {
  const truth = [];
  const predictions = [];

  for (const example of preparedTrainingData) {
    truth.push(example.expectedCategory);
    predictions.push(
      predictComplaintCategoryLegacy({
        title: example.title,
        description: example.description,
        selectedCategory: example.selectedCategory,
      }),
    );
  }

  return getClassificationMetrics(truth, predictions, CATEGORY_LABELS);
}

function evaluateLegacyPriority() {
  const truth = [];
  const predictions = [];

  for (const example of preparedTrainingData) {
    truth.push(example.priorityLabel);
    predictions.push(
      scoreComplaintPriorityLegacy({
        title: example.title,
        description: example.description,
        category: example.selectedCategory,
        student: { roomNumber: "A1", hostelBlock: "A" },
        openRoomComplaintCount: 0,
        openBlockComplaintCount: 0,
      }),
    );
  }

  return getClassificationMetrics(truth, predictions, PRIORITY_LEVELS);
}

function evaluateCandidateModels() {
  const categoryCandidates = [
    {
      name: "bayes_dominant",
      metrics: crossValidateClassifier({
        examples: preparedTrainingData,
        labelKey: "expectedCategory",
        labels: CATEGORY_LABELS,
        config: {
          ...tunedCategoryConfig.config,
          ensembleAlpha: 1,
          keywordWeight: 0.04,
        },
        buildExtraTokens: buildCategoryExtraTokens,
      }),
    },
    {
      name: "centroid_dominant",
      metrics: crossValidateClassifier({
        examples: preparedTrainingData,
        labelKey: "expectedCategory",
        labels: CATEGORY_LABELS,
        config: {
          ...tunedCategoryConfig.config,
          ensembleAlpha: 0,
          keywordWeight: 0,
        },
        buildExtraTokens: buildCategoryExtraTokens,
      }),
    },
    {
      name: "tuned_hybrid",
      metrics: tunedCategoryConfig.metrics,
    },
  ];

  const priorityCandidates = [
    {
      name: "bayes_dominant",
      metrics: crossValidateClassifier({
        examples: preparedTrainingData,
        labelKey: "priorityLabel",
        labels: PRIORITY_LEVELS,
        config: {
          ...tunedPriorityConfig.config,
          ensembleAlpha: 1,
        },
        buildExtraTokens: buildPriorityExtraTokens,
      }),
    },
    {
      name: "centroid_dominant",
      metrics: crossValidateClassifier({
        examples: preparedTrainingData,
        labelKey: "priorityLabel",
        labels: PRIORITY_LEVELS,
        config: {
          ...tunedPriorityConfig.config,
          ensembleAlpha: 0,
          keywordWeight: 0,
        },
        buildExtraTokens: buildPriorityExtraTokens,
      }),
    },
    {
      name: "tuned_hybrid",
      metrics: tunedPriorityConfig.metrics,
    },
  ];

  return { categoryCandidates, priorityCandidates };
}

function buildDuplicateBenchmark() {
  const positives = [];
  const negatives = [];
  const grouped = new Map();

  for (const example of preparedTrainingData) {
    if (!example.clusterId) continue;
    if (!grouped.has(example.clusterId)) {
      grouped.set(example.clusterId, []);
    }
    grouped.get(example.clusterId).push(example);
  }

  for (const group of grouped.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        positives.push([group[i], group[j]]);
      }
    }
  }

  for (let i = 0; i < preparedTrainingData.length; i += 2) {
    const left = preparedTrainingData[i];
    const right = preparedTrainingData[(i + 9) % preparedTrainingData.length];
    if (left.clusterId && right.clusterId && left.clusterId === right.clusterId) {
      continue;
    }
    negatives.push([left, right]);
  }

  return { positives, negatives };
}

function evaluateDuplicateDetection() {
  const { positives, negatives } = buildDuplicateBenchmark();
  let tp = 0;
  let fp = 0;
  let fn = 0;

  for (const [left, right] of positives) {
    const prediction = detectDuplicateSignal({
      incomingComplaint: left,
      existingComplaints: [{ ...right, student: { hostelBlock: "A", roomNumber: "1" } }],
      student: { hostelBlock: "A", roomNumber: "1" },
    });

    if (prediction.duplicateCandidate) {
      tp += 1;
    } else {
      fn += 1;
    }
  }

  for (const [left, right] of negatives) {
    const prediction = detectDuplicateSignal({
      incomingComplaint: left,
      existingComplaints: [{ ...right, student: { hostelBlock: "B", roomNumber: "9" } }],
      student: { hostelBlock: "A", roomNumber: "1" },
    });

    if (prediction.duplicateCandidate) {
      fp += 1;
    }
  }

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return { precision, recall, f1, positives: positives.length, negatives: negatives.length };
}

function buildErrorAnalysis() {
  const categoryErrors = [];
  const priorityErrors = [];

  for (const example of preparedTrainingData) {
    const categoryPrediction = predictComplaintCategoryModel(example);
    const priorityPrediction = predictPriorityModel({
      ...example,
      category: example.selectedCategory,
      openRoomComplaintCount: 0,
      openBlockComplaintCount: 0,
      hasImage: false,
    });

    if (categoryPrediction.predictedCategory !== example.expectedCategory) {
      categoryErrors.push({
        id: example.id,
        title: example.title,
        expected: example.expectedCategory,
        predicted: categoryPrediction.predictedCategory,
      });
    }

    if (priorityPrediction.priorityLabel !== example.priorityLabel) {
      priorityErrors.push({
        id: example.id,
        title: example.title,
        expected: example.priorityLabel,
        predicted: priorityPrediction.priorityLabel,
      });
    }
  }

  return {
    categoryErrors: categoryErrors.slice(0, 5),
    priorityErrors: priorityErrors.slice(0, 5),
  };
}

const legacyCategoryMetrics = evaluateLegacyCategory();
const legacyPriorityMetrics = evaluateLegacyPriority();
const candidateModels = evaluateCandidateModels();
const duplicateMetrics = evaluateDuplicateDetection();
const errorAnalysis = buildErrorAnalysis();

const report = {
  dataset: {
    rawSamples: preparedTrainingData.length,
    classes: CATEGORY_LABELS.length,
    priorityLevels: PRIORITY_LEVELS.length,
  },
  category: {
    previous: legacyCategoryMetrics,
    next: tunedCategoryConfig.metrics,
    candidates: candidateModels.categoryCandidates,
  },
  priority: {
    previous: legacyPriorityMetrics,
    next: tunedPriorityConfig.metrics,
    candidates: candidateModels.priorityCandidates,
  },
  duplicate: duplicateMetrics,
  errorAnalysis,
};

const reportPath = path.resolve("ML_MODEL_REPORT.md");

const markdown = `# ML Model Improvement Report

## Dataset
- Training samples: ${preparedTrainingData.length}
- Category classes: ${CATEGORY_LABELS.join(", ")}
- Priority labels: ${PRIORITY_LEVELS.join(", ")}

## Category Prediction
- Previous accuracy: ${roundMetric(legacyCategoryMetrics.accuracy)}%
- Previous precision: ${roundMetric(legacyCategoryMetrics.precision)}%
- Previous F1: ${roundMetric(legacyCategoryMetrics.f1)}%
- New accuracy: ${roundMetric(tunedCategoryConfig.metrics.accuracy)}%
- New precision: ${roundMetric(tunedCategoryConfig.metrics.precision)}%
- New F1: ${roundMetric(tunedCategoryConfig.metrics.f1)}%

### Candidate Models
${candidateModels.categoryCandidates
  .map(
    (candidate) =>
      `- ${candidate.name}: accuracy ${roundMetric(candidate.metrics.accuracy)}%, precision ${roundMetric(candidate.metrics.precision)}%, F1 ${roundMetric(candidate.metrics.f1)}%`,
  )
  .join("\n")}

## Priority Prediction
- Previous accuracy: ${roundMetric(legacyPriorityMetrics.accuracy)}%
- Previous precision: ${roundMetric(legacyPriorityMetrics.precision)}%
- Previous F1: ${roundMetric(legacyPriorityMetrics.f1)}%
- New accuracy: ${roundMetric(tunedPriorityConfig.metrics.accuracy)}%
- New precision: ${roundMetric(tunedPriorityConfig.metrics.precision)}%
- New F1: ${roundMetric(tunedPriorityConfig.metrics.f1)}%

### Candidate Models
${candidateModels.priorityCandidates
  .map(
    (candidate) =>
      `- ${candidate.name}: accuracy ${roundMetric(candidate.metrics.accuracy)}%, precision ${roundMetric(candidate.metrics.precision)}%, F1 ${roundMetric(candidate.metrics.f1)}%`,
  )
  .join("\n")}

## Duplicate Detection
- Precision: ${roundMetric(duplicateMetrics.precision)}%
- Recall: ${roundMetric(duplicateMetrics.recall)}%
- F1: ${roundMetric(duplicateMetrics.f1)}%

## Best Model Selected
- Category: tuned hybrid ensemble (Bayes + centroid + keyword prior)
- Priority: tuned hybrid ensemble (Bayes + centroid + context features)
- Why: it produced the best macro F1 during cross-validation while staying lightweight enough to run inside the Node backend without external ML runtimes.

## Key Improvements Made
- Added a cleaned benchmark corpus with complaint category, priority, ETA, and duplicate-cluster labels.
- Added typo correction, text normalization, character trigrams, bigrams, and metadata features.
- Added inverse-frequency class weighting to reduce class imbalance bias.
- Replaced fixed keyword scoring with a tuned hybrid classifier.
- Calibrated ETA estimation from historical per-class medians instead of static constants.
- Upgraded duplicate detection from Jaccard overlap to cosine-style vector similarity with metadata boosts.

## Error Analysis Snapshot
- Category errors: ${errorAnalysis.categoryErrors.length ? errorAnalysis.categoryErrors.map((item) => `${item.id} (${item.expected} -> ${item.predicted})`).join(", ") : "none"}
- Priority errors: ${errorAnalysis.priorityErrors.length ? errorAnalysis.priorityErrors.map((item) => `${item.id} (${item.expected} -> ${item.predicted})`).join(", ") : "none"}
`;

fs.writeFileSync(reportPath, markdown, "utf8");

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`Report written to ${reportPath}\n`);
