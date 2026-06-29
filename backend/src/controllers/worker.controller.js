import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Complaint } from "../models/complaint.model.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { authCookieOptions } from "../config/cookies.js";
import { createNotification } from "../services/notification.service.js";
import {
  assertValidObjectId,
  getMissingRequiredFields,
  isValidEmail,
  normalizeTrimmedFields,
} from "../validators/request.validator.js";

const loginWorker = asyncHandler(async (req, res) => {
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

  if (!user || user.role !== "worker") {
    throw new ApiError(401, "Worker not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const accessToken = user.generateAccessToken();

  const loggedInWorker = await User.findById(user._id).select("-password");

  return res
    .status(200)
    .cookie("accessToken", accessToken, authCookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          worker: loggedInWorker,
          accessToken,
        },
        "Worker logged in successfully",
      ),
    );
});

const logoutWorker = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .clearCookie("accessToken", authCookieOptions)
    .json(new ApiResponse(200, {}, "Worker logged out"));
});

const getAssignedComplaints = asyncHandler(async (req, res) => {
  if (req.user.role !== "worker") {
    throw new ApiError(403, "Only workers allowed");
  }

  const complaints = await Complaint.find({
    assignedWorker: req.user._id,
  }).populate("student", "name email roomNumber hostelBlock");

  return res
    .status(200)
    .json(new ApiResponse(200, complaints, "Worker complaints fetched"));
});

const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { complaintId } = req.params;
  const { status } = req.body;

  if (req.user.role !== "worker") {
    throw new ApiError(403, "Only workers allowed");
  }

  const allowedStatus = ["in_progress"];

  if (!allowedStatus.includes(status)) {
    throw new ApiError(
      400,
      "Workers can only move complaints to in_progress from this endpoint",
    );
  }

  assertValidObjectId(complaintId, "complaintId");

  const complaint = await Complaint.findById(complaintId);

  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (!complaint.assignedWorker) {
    throw new ApiError(400, "No worker assigned");
  }

  if (complaint.assignedWorker.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  if (complaint.status !== "assigned") {
    throw new ApiError(
      400,
      "Only assigned complaints can be moved to in_progress",
    );
  }

  complaint.status = status;
  await complaint.save();

  const student = await User.findById(complaint.student);

  if (student) {
    const statusMessage =
      status === "in_progress" ? "Work Started" : "Work Completed";
    const statusNotif =
      status === "in_progress" ? "status_updated" : "complaint_resolved";
    await createNotification({
      userId: student._id,
      role: "student",
      title: statusMessage,
      message: `Your complaint "${complaint.title}" status has been updated to ${status.replace("_", " ")}`,
      type: statusNotif,
      relatedComplaintId: complaint._id,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, complaint, "Status updated successfully"));
});

const uploadCompletionImage = asyncHandler(async (req, res) => {
  const { complaintId } = req.params;

  if (req.user.role !== "worker") {
    throw new ApiError(403, "Only workers allowed");
  }

  assertValidObjectId(complaintId, "complaintId");

  if (!req.file?.path) {
    throw new ApiError(400, "Image is required");
  }

  const complaint = await Complaint.findById(complaintId);

  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (!complaint.assignedWorker) {
    throw new ApiError(400, "No worker assigned");
  }

  if (complaint.assignedWorker.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  if (complaint.status !== "in_progress") {
    throw new ApiError(
      400,
      "Complaint must be in progress before it can be completed",
    );
  }

  const uploadedImage = await uploadOnCloudinary(req.file.path);

  if (!uploadedImage) {
    throw new ApiError(500, "Image upload failed");
  }

  complaint.afterImage = uploadedImage.url;
  complaint.status = "resolved";
  await complaint.save();

  const student = await User.findById(complaint.student);
  const admin = await User.findOne({ role: "admin" });

  if (student) {
    await createNotification({
      userId: student._id,
      role: "student",
      title: "Work Completed",
      message: `Your complaint "${complaint.title}" has been resolved`,
      type: "complaint_resolved",
      relatedComplaintId: complaint._id,
    });
  }

  if (admin) {
    await createNotification({
      userId: admin._id,
      role: "admin",
      title: "Complaint Resolved",
      message: `Complaint "${complaint.title}" has been marked as resolved`,
      type: "complaint_resolved",
      relatedComplaintId: complaint._id,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, complaint, "Work completed with image"));
});

export {
  loginWorker,
  logoutWorker,
  getAssignedComplaints,
  updateComplaintStatus,
  uploadCompletionImage,
};
