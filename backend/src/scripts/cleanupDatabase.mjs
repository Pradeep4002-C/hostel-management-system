import mongoose from "mongoose";
import fs from "node:fs/promises";
import path from "node:path";
import { env, validateEnv } from "../config/env.js";
import { Complaint } from "../models/complaint.model.js";
import { Notification } from "../models/notification.model.js";

validateEnv();
await mongoose.connect(env.mongoUri, { dbName: env.databaseName });

const complaintIds = new Set(
  (await Complaint.find().select("_id").lean()).map(({ _id }) => String(_id)),
);
const staleNotifications = await Notification.find({
  relatedComplaintId: { $ne: null },
}).select("_id relatedComplaintId");
const staleNotificationIds = staleNotifications
  .filter(({ relatedComplaintId }) => !complaintIds.has(String(relatedComplaintId)))
  .map(({ _id }) => _id);

const mediaRecords = await Complaint.find().select("image afterImage").lean();
const referencedFiles = new Set(
  mediaRecords
    .flatMap(({ image, afterImage }) => [image, afterImage])
    .filter((value) => value?.startsWith("/uploads/"))
    .map((value) => path.basename(value)),
);
const uploadDirectory = path.resolve("public", "uploads");
const storedFiles = await fs.readdir(uploadDirectory).catch(() => []);
const orphanedFiles = storedFiles.filter((file) => !referencedFiles.has(file));

await Notification.deleteMany({ _id: { $in: staleNotificationIds } });
await Promise.all(
  orphanedFiles.map((file) => fs.unlink(path.join(uploadDirectory, file))),
);

process.stdout.write(`${JSON.stringify({
  deletedNotifications: staleNotificationIds.length,
  deletedUploadFiles: orphanedFiles.length,
}, null, 2)}\n`);

await mongoose.disconnect();
