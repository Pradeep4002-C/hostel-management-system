import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Complaint } from "../models/complaint.model.js";
import { authCookieOptions } from "../config/cookies.js";
import {
  PASSWORD_MIN_LENGTH,
  getMissingRequiredFields,
  isStrongEnoughPassword,
  isValidEmail,
  isValidPhoneNumber,
  normalizeTrimmedFields,
} from "../validators/request.validator.js";

const registerStudent = asyncHandler(async (req, res) => {
  const fields = normalizeTrimmedFields(req.body);
  const {
    name,
    email: rawEmail,
    password,
    phoneNumber,
    hostelBlock,
    roomNumber,
  } = fields;
  const email = rawEmail?.toLowerCase();
  const missingFields = getMissingRequiredFields({
    name,
    email,
    password,
    phoneNumber,
    hostelBlock,
    roomNumber,
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

  if (!isValidPhoneNumber(phoneNumber)) {
    throw new ApiError(400, "Invalid phone number");
  }

  const existedUser = await User.findOne({ email });

  if (existedUser) {
    throw new ApiError(409, "User Already Exist");
  }

  const user = await User.create({
    name,
    email,
    password,
    phoneNumber,
    hostelBlock,
    roomNumber,
  });

  const createdUser = await User.findById(user._id).select("-password");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "Student registered successfully"));
});

const loginStudent = asyncHandler(async (req, res) => {
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

  if (!user || user.role !== "student") {
    throw new ApiError(401, "Student not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
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
        "Student logged In Successfully",
      ),
    );
});

const logoutStudent = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .clearCookie("accessToken", authCookieOptions)
    .json(new ApiResponse(200, {}, "Student logged Out"));
});

const getMyComplaints = asyncHandler(async (req, res) => {
  if (req.user.role !== "student") {
    throw new ApiError(403, "Only students allowed");
  }

  const complaints = await Complaint.find({
    student: req.user._id,
  })
    .populate("assignedWorker", "name workerType")
    .populate("duplicateOf", "title category createdAt")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, complaints, "Student complaints fetched"));
});

export { registerStudent, loginStudent, logoutStudent, getMyComplaints };
