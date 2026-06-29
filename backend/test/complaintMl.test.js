import assert from "node:assert/strict";
import test from "node:test";
import {
  detectDuplicateComplaint,
  predictComplaintCategory,
  predictResolutionTime,
  scoreComplaintPriority,
} from "../src/services/complaintMl.service.js";

test("predicts category from complaint text and detects category mismatch", () => {
  const prediction = predictComplaintCategory({
    title: "Switch board sparking",
    description: "There is smoke and burning smell near the bed socket.",
    selectedCategory: "cleaning",
  });

  assert.equal(prediction.predictedCategory, "electrical");
  assert.equal(prediction.categoryMismatch, true);
  assert.ok(prediction.categoryPredictionConfidence >= 0.6);
});

test("scores emergency complaint priority as critical", () => {
  const prediction = scoreComplaintPriority({
    title: "Socket is sparking",
    description: "Burning smell and smoke from the switch board.",
    category: "electrical",
    student: { hostelBlock: "A", roomNumber: "101" },
    openRoomComplaintCount: 0,
    openBlockComplaintCount: 0,
  });

  assert.equal(prediction.priorityLabel, "critical");
  assert.ok(prediction.priorityScore >= 90);
});

test("detects duplicate complaints using text and location signals", () => {
  const existingComplaint = {
    _id: "507f1f77bcf86cd799439011",
    title: "Water leak under washbasin",
    description: "Pipe under the sink is leaking and water is spreading.",
    category: "plumbing",
    student: { hostelBlock: "B", roomNumber: "204" },
  };

  const prediction = detectDuplicateComplaint({
    incomingComplaint: {
      title: "Sink pipe leak",
      description: "The wash basin pipe is leaking and the floor is wet.",
      category: "plumbing",
    },
    existingComplaints: [existingComplaint],
    student: { hostelBlock: "B", roomNumber: "204" },
  });

  assert.equal(prediction.duplicateCandidate, true);
  assert.equal(prediction.duplicateOf, existingComplaint._id);
});

test("returns bounded resolution ETA prediction", () => {
  const prediction = predictResolutionTime({
    category: "plumbing",
    priorityLabel: "high",
    duplicateCandidate: false,
    workerLoad: 2,
    hasImage: true,
  });

  assert.ok(prediction.estimatedResolutionHours >= 2);
  assert.ok(prediction.estimatedResolutionHours <= 72);
  assert.match(prediction.estimatedResolutionRange, /Within|Same day|More than/);
  assert.ok(prediction.resolutionConfidence >= 0.4);
});
