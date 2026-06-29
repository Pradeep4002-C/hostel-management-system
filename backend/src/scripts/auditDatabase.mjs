import mongoose from "mongoose";
import fs from "node:fs/promises";
import path from "node:path";
import { env, validateEnv } from "../config/env.js";
import { User } from "../models/user.model.js";
import { Complaint } from "../models/complaint.model.js";
import { Notification } from "../models/notification.model.js";

validateEnv();
await mongoose.connect(env.mongoUri, { dbName: env.databaseName });

const orphanCount = async (Model, localField, from) => {
  const result = await Model.aggregate([
    { $match: { [localField]: { $ne: null } } },
    { $lookup: { from, localField, foreignField: "_id", as: "related" } },
    { $match: { related: { $size: 0 } } },
    { $count: "count" },
  ]);
  return result[0]?.count || 0;
};

const [users, complaints, notifications, orphanStudents, orphanWorkers, orphanNotificationUsers, orphanNotificationComplaints, mediaRecords] =
  await Promise.all([
    User.countDocuments(),
    Complaint.countDocuments(),
    Notification.countDocuments(),
    orphanCount(Complaint, "student", "users"),
    orphanCount(Complaint, "assignedWorker", "users"),
    orphanCount(Notification, "userId", "users"),
    orphanCount(Notification, "relatedComplaintId", "complaints"),
    Complaint.find({ $or: [{ image: /^\/uploads\// }, { afterImage: /^\/uploads\// }] })
      .select("image afterImage")
      .lean(),
  ]);

const uploadDirectory = path.resolve("public", "uploads");
const storedFiles = await fs.readdir(uploadDirectory).catch(() => []);
const referencedFiles = new Set(
  mediaRecords
    .flatMap(({ image, afterImage }) => [image, afterImage])
    .filter((value) => value?.startsWith("/uploads/"))
    .map((value) => path.basename(value)),
);
const orphanedUploadFiles = storedFiles.filter((file) => !referencedFiles.has(file));

process.stdout.write(`${JSON.stringify({
  counts: { users, complaints, notifications },
  orphanRecords: {
    complaintStudents: orphanStudents,
    complaintWorkers: orphanWorkers,
    notificationUsers: orphanNotificationUsers,
    notificationComplaints: orphanNotificationComplaints,
  },
  localUploads: {
    stored: storedFiles.length,
    referenced: referencedFiles.size,
    orphanedFiles: orphanedUploadFiles,
  },
}, null, 2)}\n`);

await mongoose.disconnect();
