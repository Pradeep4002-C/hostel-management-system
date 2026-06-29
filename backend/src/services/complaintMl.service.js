import {
  HIGH_LOAD_STATUSES,
  detectDuplicateSignal,
  estimateResolutionModel,
  normalizeCategory,
  predictComplaintCategoryModel,
  predictPriorityModel,
  recommendWorkersModel,
} from "../ml/inference/complaintModeling.js";

export { HIGH_LOAD_STATUSES, normalizeCategory };

export function predictComplaintCategory({
  title,
  description,
  selectedCategory,
}) {
  return predictComplaintCategoryModel({
    title,
    description,
    selectedCategory,
  });
}

export function scoreComplaintPriority({
  title,
  description,
  category,
  student,
  openRoomComplaintCount = 0,
  openBlockComplaintCount = 0,
}) {
  return predictPriorityModel({
    title,
    description,
    category,
    selectedCategory: category,
    student,
    openRoomComplaintCount,
    openBlockComplaintCount,
  });
}

export function recommendWorkersForComplaint({
  complaint,
  workers,
  workerLoadMap,
}) {
  return recommendWorkersModel({
    complaint,
    workers,
    workerLoadMap,
  });
}

export function detectDuplicateComplaint({
  incomingComplaint,
  existingComplaints,
  student,
}) {
  return detectDuplicateSignal({
    incomingComplaint,
    existingComplaints,
    student,
  });
}

export function predictResolutionTime({
  category,
  priorityLabel,
  duplicateCandidate = false,
  openRoomComplaintCount = 0,
  openBlockComplaintCount = 0,
  workerLoad = 0,
  hasImage = false,
}) {
  return estimateResolutionModel({
    category,
    priorityLabel,
    duplicateCandidate,
    openRoomComplaintCount,
    openBlockComplaintCount,
    workerLoad,
    hasImage,
  });
}
