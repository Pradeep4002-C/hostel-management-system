import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Complaint } from "../models/complaint.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createNotification } from "../services/notification.service.js";
import {
  detectDuplicateComplaint,
  HIGH_LOAD_STATUSES,
  normalizeCategory,
  predictComplaintCategory,
  predictResolutionTime,
  scoreComplaintPriority,
} from "../services/complaintMl.service.js";
import {
  assertValidObjectId,
  getMissingRequiredFields,
  normalizeTrimmedFields,
} from "../validators/request.validator.js";

const createComplaint = asyncHandler(async (req, res) => {
  const { title, description, category } = normalizeTrimmedFields(req.body);

  if (req.user.role !== "student") {
    throw new ApiError(403, "Only students can create complaints");
  }

  const missingFields = getMissingRequiredFields({
    title,
    description,
    category,
  });

  if (missingFields.length > 0) {
    throw new ApiError(
      400,
      `Missing required fields: ${missingFields.join(", ")}`,
    );
  }

  const normalizedCategory = normalizeCategory(category);
  if (!normalizedCategory) {
    throw new ApiError(400, "Invalid complaint category");
  }

  const uploadedImage = req.file?.path
    ? await uploadOnCloudinary(req.file.path)
    : null;

  if (req.file?.path && !uploadedImage) {
    throw new ApiError(500, "Image upload failed");
  }

  const [roomStudents, blockStudents] = await Promise.all([
    req.user.roomNumber
      ? User.find({
          role: "student",
          hostelBlock: req.user.hostelBlock,
          roomNumber: req.user.roomNumber,
        }).select("_id")
      : [],
    req.user.hostelBlock
      ? User.find({
          role: "student",
          hostelBlock: req.user.hostelBlock,
        }).select("_id")
      : [],
  ]);

  const roomStudentIds = roomStudents.map((student) => student._id);
  const blockStudentIds = blockStudents.map((student) => student._id);

  const [openRoomComplaintCount, openBlockComplaintCount] = await Promise.all([
    roomStudentIds.length
      ? Complaint.countDocuments({
          student: { $in: roomStudentIds },
          status: { $in: HIGH_LOAD_STATUSES },
        })
      : 0,
    blockStudentIds.length
      ? Complaint.countDocuments({
          student: { $in: blockStudentIds },
          status: { $in: HIGH_LOAD_STATUSES },
        })
      : 0,
  ]);

  const duplicateCandidates = blockStudentIds.length
    ? await Complaint.find({
        student: { $in: blockStudentIds },
        status: { $in: HIGH_LOAD_STATUSES },
      }).populate("student", "name hostelBlock roomNumber")
    : [];

  const categoryPrediction = predictComplaintCategory({
    title,
    description,
    selectedCategory: category,
  });

  const effectiveCategory =
    categoryPrediction.predictedCategory || normalizeCategory(category) || category;

  const priorityPrediction = scoreComplaintPriority({
    title,
    description,
    category: effectiveCategory,
    student: req.user,
    openRoomComplaintCount,
    openBlockComplaintCount,
  });

  const duplicatePrediction = detectDuplicateComplaint({
    incomingComplaint: {
      title,
      description,
      category,
      predictedCategory: categoryPrediction.predictedCategory,
    },
    existingComplaints: duplicateCandidates,
    student: req.user,
  });

  const resolutionPrediction = predictResolutionTime({
    category: effectiveCategory,
    priorityLabel: priorityPrediction.priorityLabel,
    duplicateCandidate: duplicatePrediction.duplicateCandidate,
    openRoomComplaintCount,
    openBlockComplaintCount,
    workerLoad: 0,
    hasImage: Boolean(uploadedImage?.url),
  });

  const complaint = await Complaint.create({
    student: req.user._id,
    title,
    description,
    category: normalizedCategory,
    image: uploadedImage?.url || null,
    assignedWorker: null,
    status: "pending",
    ...categoryPrediction,
    ...priorityPrediction,
    ...duplicatePrediction,
    ...resolutionPrediction,
  });

  const createdComplaint = await Complaint.findById(complaint._id)
    .populate("student", "name email")
    .populate("assignedWorker", "name workerType")
    .populate("duplicateOf", "title category createdAt");

  const admin = await User.findOne({ role: "admin" });
  if (admin) {
    await createNotification({
      userId: admin._id,
      role: "admin",
      title: "New Complaint Received",
      message: `A new complaint "${title}" has been created by ${req.user.name}`,
      type: "complaint_created",
      relatedComplaintId: complaint._id,
    });
  }

  return res
    .status(201)
    .json(
      new ApiResponse(201, createdComplaint, "Complaint created successfully"),
    );
});

const assignWorker = asyncHandler(async (req, res) => {
  const { complaintId } = req.params;
  const { workerId } = normalizeTrimmedFields(req.body);

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can assign worker");
  }

  if (!workerId) {
    throw new ApiError(400, "Worker is required");
  }

  assertValidObjectId(complaintId, "complaintId");
  assertValidObjectId(workerId, "workerId");

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  const worker = await User.findById(workerId);
  if (!worker || worker.role !== "worker") {
    throw new ApiError(404, "Worker not found");
  }

  const workerLoad = await Complaint.countDocuments({
    assignedWorker: worker._id,
    status: { $in: HIGH_LOAD_STATUSES },
  });

  const refreshedResolutionPrediction = predictResolutionTime({
    category: complaint.predictedCategory || complaint.category,
    priorityLabel: complaint.priorityLabel,
    duplicateCandidate: complaint.duplicateCandidate,
    workerLoad,
    hasImage: Boolean(complaint.image),
  });

  complaint.assignedWorker = workerId;
  complaint.status = "assigned";
  complaint.estimatedResolutionHours =
    refreshedResolutionPrediction.estimatedResolutionHours;
  complaint.estimatedResolutionRange =
    refreshedResolutionPrediction.estimatedResolutionRange;
  complaint.resolutionEtaLabel = refreshedResolutionPrediction.resolutionEtaLabel;
  complaint.resolutionConfidence =
    refreshedResolutionPrediction.resolutionConfidence;
  complaint.resolutionReasons = refreshedResolutionPrediction.resolutionReasons;
  complaint.resolutionModelVersion =
    refreshedResolutionPrediction.resolutionModelVersion;
  await complaint.save();

  const updatedComplaint = await Complaint.findById(complaintId)
    .populate("student", "name email")
    .populate("assignedWorker", "name workerType");

  const student = await User.findById(complaint.student);

  await createNotification({
    userId: worker._id,
    role: "worker",
    title: "New Task Assigned",
    message: `You have been assigned to handle complaint: "${complaint.title}"`,
    type: "worker_assigned",
    relatedComplaintId: complaint._id,
  });

  if (student) {
    await createNotification({
      userId: student._id,
      role: "student",
      title: "Worker Assigned",
      message: `A worker has been assigned to your complaint: "${complaint.title}"`,
      type: "worker_assigned",
      relatedComplaintId: complaint._id,
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedComplaint, "Worker assigned successfully"),
    );
});

export { createComplaint, assignWorker };
