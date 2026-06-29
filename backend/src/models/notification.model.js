import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    maxlength: 120,
  },
  role: {
    type: String,
    enum: ["admin", "student", "worker"],
    required: true,
    maxlength: 500,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "complaint_created",
      "worker_assigned",
      "status_updated",
      "complaint_resolved",
    ],
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  relatedComplaintId: {
    type: Schema.Types.ObjectId,
    ref: "Complaint",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ relatedComplaintId: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
