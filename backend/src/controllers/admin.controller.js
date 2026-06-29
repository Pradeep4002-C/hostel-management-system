import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Complaint } from "../models/complaint.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  HIGH_LOAD_STATUSES,
  recommendWorkersForComplaint,
} from "../services/complaintMl.service.js";
import { authCookieOptions } from "../config/cookies.js";
import {
  PASSWORD_MIN_LENGTH,
  assertValidObjectId,
  getMissingRequiredFields,
  isStrongEnoughPassword,
  isValidEmail,
  normalizeTrimmedFields,
} from "../validators/request.validator.js";
import { createNotification } from "../services/notification.service.js";

const loginAdmin = asyncHandler(async (req, res) => {
  const { email: rawEmail, password } = normalizeTrimmedFields(req.body);
  const email = rawEmail?.toLowerCase();
  const missingFields = getMissingRequiredFields({ email, password });

  if (missingFields.length > 0) {
    throw new ApiError(
      400,
      `Missing required fields: ${missingFields.join(", ")}`,
    );
  }

  if (!isValidEmail(email)) {
    throw new ApiError(400, "Invalid email address");
  }

  const user = await User.findOne({ email });

  if (!user || user.role !== "admin") {
    throw new ApiError(401, "Admin not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const accessToken = user.generateAccessToken();

  const loggedInUser = await User.findById(user._id).select("-password");

  return res
    .status(200)
    .cookie("accessToken", accessToken, authCookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
        },
        "Admin logged in successfully",
      ),
    );
});

const logoutAdmin = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .clearCookie("accessToken", authCookieOptions)
    .json(new ApiResponse(200, {}, "Admin logged out"));
});

const createWorker = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can create workers");
  }

  const { name, email: rawEmail, password, workerType } = normalizeTrimmedFields(
    req.body,
  );
  const email = rawEmail?.toLowerCase();
  const missingFields = getMissingRequiredFields({
    name,
    email,
    password,
    workerType,
  });

  if (missingFields.length > 0) {
    throw new ApiError(
      400,
      `Missing required fields: ${missingFields.join(", ")}`,
    );
  }

  if (!isValidEmail(email)) {
    throw new ApiError(400, "Invalid email address");
  }

  if (!isStrongEnoughPassword(password)) {
    throw new ApiError(
      400,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  }

  if (!["electrical", "plumbing", "carpentry", "cleaning"].includes(workerType)) {
    throw new ApiError(400, "Invalid worker type");
  }

  const existedUser = await User.findOne({ email });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  const worker = await User.create({
    name,
    email,
    password,
    role: "worker",
    workerType,
  });

  const createdWorker = await User.findById(worker._id).select("-password");

  return res
    .status(201)
    .json(new ApiResponse(201, createdWorker, "Worker created successfully"));
});

const getAllComplaints = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can view complaints");
  }

  const [complaints, workers, workerLoads] = await Promise.all([
    Complaint.find()
      .populate("student", "name email hostelBlock roomNumber")
      .populate("assignedWorker", "name workerType")
      .populate("duplicateOf", "title category createdAt")
      .sort({ priorityScore: -1, createdAt: -1 })
      .lean(),
    User.find({ role: "worker" }).select("name workerType").lean(),
    Complaint.aggregate([
      {
        $match: {
          assignedWorker: { $ne: null },
          status: { $in: HIGH_LOAD_STATUSES },
        },
      },
      {
        $group: {
          _id: "$assignedWorker",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const workerLoadMap = Object.fromEntries(
    workerLoads.map((entry) => [String(entry._id), entry.count]),
  );

  const complaintsWithRecommendations = complaints.map((complaint) => {
    const recommendedWorkers = recommendWorkersForComplaint({
      complaint,
      workers,
      workerLoadMap,
    });

    return {
      ...complaint,
      recommendedWorkers,
      recommendedWorker: recommendedWorkers[0] || null,
    };
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        complaintsWithRecommendations,
        "All complaints fetched",
      ),
    );
});

const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { complaintId } = req.params;
  const { status } = req.body;
  const allowedStatuses = ["pending", "assigned", "in_progress", "resolved"];
  const allowedTransitions = {
    pending: ["assigned"],
    assigned: ["in_progress"],
    in_progress: ["resolved"],
    resolved: [],
  };

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can update status");
  }

  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  assertValidObjectId(complaintId, "complaintId");

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (
    ["assigned", "in_progress", "resolved"].includes(status) &&
    !complaint.assignedWorker
  ) {
    throw new ApiError(
      400,
      "Assign a worker before moving a complaint beyond pending",
    );
  }

  if (status !== complaint.status && !allowedTransitions[complaint.status]?.includes(status)) {
    throw new ApiError(
      409,
      `Complaint cannot move from ${complaint.status} to ${status}`,
    );
  }

  complaint.status = status;
  await complaint.save();

  const updatedComplaint = await Complaint.findById(complaintId)
    .populate("student", "name email")
    .populate("assignedWorker", "name workerType");

  const student = await User.findById(complaint.student);

  if (student) {
    await createNotification({
      userId: student._id,
      role: "student",
      title: "Status Updated",
      message: `Your complaint "${complaint.title}" status has been updated to ${status.replace("_", " ")}`,
      type: "status_updated",
      relatedComplaintId: complaint._id,
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedComplaint, "Status updated successfully"),
    );
});

const updateComplaintPriority = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can update priority");
  }

  const { complaintId } = req.params;
  const { priority } = normalizeTrimmedFields(req.body);
  const allowedPriorities = ["low", "medium", "high", "critical"];
  assertValidObjectId(complaintId, "complaintId");

  if (!allowedPriorities.includes(priority)) {
    throw new ApiError(400, "Invalid priority");
  }

  const complaint = await Complaint.findByIdAndUpdate(
    complaintId,
    {
      priorityLabel: priority,
      $push: { priorityReasons: "Priority reviewed by an administrator" },
    },
    { returnDocument: "after", runValidators: true },
  )
    .populate("student", "name email hostelBlock roomNumber")
    .populate("assignedWorker", "name workerType");

  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, complaint, "Priority updated successfully"));
});

const getAllWorkers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can view workers");
  }

  const workers = await User.find({ role: "worker" }).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, workers, "Workers fetched successfully"));
});

export {
  loginAdmin,
  logoutAdmin,
  createWorker,
  getAllComplaints,
  updateComplaintStatus,
  updateComplaintPriority,
  getAllWorkers,
};
