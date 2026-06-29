import mongoose, { Schema } from "mongoose";

const complaintSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },

    category: {
      type: String,
      enum: ["electrical", "plumbing", "carpentry", "cleaning"],
      required: true,
    },

    image: {
      type: String, // Cloudinary URL
    },
    afterImage: {
      type: String, // Cloudinary URL of completed work
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "assigned", "in_progress", "resolved"],
      default: "pending",
    },
    priorityScore: {
      type: Number,
      default: 0,
    },
    priorityLabel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    priorityConfidence: {
      type: Number,
      default: 0,
    },
    priorityReasons: {
      type: [String],
      default: [],
    },
    priorityModelVersion: {
      type: String,
      default: "priority-v1",
    },
    predictedCategory: {
      type: String,
      enum: ["electrical", "plumbing", "carpentry", "cleaning"],
      default: null,
    },
    categoryPredictionConfidence: {
      type: Number,
      default: 0,
    },
    categoryPredictionReasons: {
      type: [String],
      default: [],
    },
    categoryMismatch: {
      type: Boolean,
      default: false,
    },
    categoryModelVersion: {
      type: String,
      default: "category-v1",
    },
    duplicateCandidate: {
      type: Boolean,
      default: false,
    },
    duplicateOf: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
    },
    duplicateMatchScore: {
      type: Number,
      default: 0,
    },
    duplicateReasons: {
      type: [String],
      default: [],
    },
    duplicateModelVersion: {
      type: String,
      default: "duplicate-v1",
    },
    estimatedResolutionHours: {
      type: Number,
      default: 0,
    },
    estimatedResolutionRange: {
      type: String,
      default: "Not estimated",
    },
    resolutionEtaLabel: {
      type: String,
      enum: ["quick", "standard", "slow", "critical_watch"],
      default: "standard",
    },
    resolutionConfidence: {
      type: Number,
      default: 0,
    },
    resolutionReasons: {
      type: [String],
      default: [],
    },
    resolutionModelVersion: {
      type: String,
      default: "resolution-v1",
    },

    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedWorker: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

complaintSchema.index({ student: 1, createdAt: -1 });
complaintSchema.index({ assignedWorker: 1, status: 1 });
complaintSchema.index({ status: 1, priorityScore: -1, createdAt: -1 });
complaintSchema.index({ category: 1, status: 1 });

export const Complaint = mongoose.model("Complaint", complaintSchema);
