import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { Complaint } from "../src/models/complaint.model.js";
import { Notification } from "../src/models/notification.model.js";
import { User } from "../src/models/user.model.js";

let server;
let baseUrl;
const uploadedLocalFiles = [];
const suffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
const emails = {
  admin: `runtime-admin-${suffix}@example.com`,
  student: `runtime-student-${suffix}@example.com`,
  worker: `runtime-worker-${suffix}@example.com`,
};
const password = "runtimePass123";

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  await mongoose.connect(env.mongoUri, {
    dbName: env.databaseName,
    serverSelectionTimeoutMS: 10000,
  });

  await User.deleteMany({ email: { $in: Object.values(emails) } });
  await User.create({
    name: "Runtime Admin",
    email: emails.admin,
    password,
    role: "admin",
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  const users = await User.find({ email: { $in: Object.values(emails) } }).select("_id");
  const userIds = users.map((user) => user._id);
  const complaints = await Complaint.find({ student: { $in: userIds } }).select("_id");
  const complaintIds = complaints.map((complaint) => complaint._id);
  for (const filePath of uploadedLocalFiles) {
    await fs.unlink(filePath).catch(() => undefined);
  }
  await fs.rm(path.resolve("public", "temp"), { recursive: true, force: true });
  await fs.rm(path.resolve("public", "uploads"), { recursive: true, force: true });
  await fs.rmdir(path.resolve("public")).catch(() => undefined);
  await Complaint.deleteMany({ student: { $in: userIds } });
  await Notification.deleteMany({
    $or: [
      { userId: { $in: userIds } },
      { relatedComplaintId: { $in: complaintIds } },
    ],
  });
  await User.deleteMany({ email: { $in: Object.values(emails) } });
  await mongoose.disconnect();
  await new Promise((resolve) => server.close(resolve));
});

test("runtime API flow performs auth, CRUD, notifications, and ML prediction", async () => {
  const health = await request("/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.body.success, true);

  const missingLogin = await request("/api/v1/student/login", {
    method: "POST",
    body: JSON.stringify({ email: "bad@example.com" }),
  });
  assert.equal(missingLogin.response.status, 400);

  const studentRegister = await request("/api/v1/student/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Runtime Student",
      email: emails.student,
      password,
      phoneNumber: "+91 98765 43210",
      hostelBlock: "A",
      roomNumber: "101",
    }),
  });
  assert.equal(studentRegister.response.status, 201);
  assert.equal(studentRegister.body.data.email, emails.student);

  const adminLogin = await request("/api/v1/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: emails.admin, password }),
  });
  assert.equal(adminLogin.response.status, 200);
  const adminToken = adminLogin.body.data.accessToken;
  assert.ok(adminToken);

  const createWorker = await request("/api/v1/admin/workers", {
    method: "POST",
    headers: authHeader(adminToken),
    body: JSON.stringify({
      name: "Runtime Worker",
      email: emails.worker,
      password,
      workerType: "electrical",
    }),
  });
  assert.equal(createWorker.response.status, 201);
  const workerId = createWorker.body.data._id;

  const studentLogin = await request("/api/v1/student/login", {
    method: "POST",
    body: JSON.stringify({ email: emails.student, password }),
  });
  assert.equal(studentLogin.response.status, 200);
  const studentToken = studentLogin.body.data.accessToken;

  const createComplaint = await request("/api/v1/complaint", {
    method: "POST",
    headers: authHeader(studentToken),
    body: JSON.stringify({
      title: "Switch board sparking near bed",
      description: "Smoke and burning smell are coming from the socket.",
      category: "cleaning",
    }),
  });
  assert.equal(createComplaint.response.status, 201);
  const complaint = createComplaint.body.data;
  assert.equal(complaint.predictedCategory, "electrical");
  assert.equal(complaint.categoryMismatch, true);
  assert.equal(complaint.priorityLabel, "critical");

  const imageForm = new FormData();
  imageForm.append("title", "Water leak near sink");
  imageForm.append("description", "Leakage near sink with water spreading on the floor.");
  imageForm.append("category", "plumbing");
  imageForm.append(
    "image",
    new Blob([
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        "base64",
      ),
    ], { type: "image/png" }),
    "runtime-upload.png",
  );

  const imageComplaintResponse = await fetch(`${baseUrl}/api/v1/complaint`, {
    method: "POST",
    headers: authHeader(studentToken),
    body: imageForm,
  });
  const imageComplaintBody = await imageComplaintResponse.json();
  assert.equal(imageComplaintResponse.status, 201);
  assert.ok(imageComplaintBody.data.image);
  if (imageComplaintBody.data.image.startsWith("/uploads/")) {
    uploadedLocalFiles.push(
      path.resolve("public", imageComplaintBody.data.image.replace(/^\//, "")),
    );
  }

  const studentComplaints = await request("/api/v1/student/complaints", {
    headers: authHeader(studentToken),
  });
  assert.equal(studentComplaints.response.status, 200);
  assert.equal(studentComplaints.body.data.length, 2);

  const adminComplaints = await request("/api/v1/admin/complaints", {
    headers: authHeader(adminToken),
  });
  assert.equal(adminComplaints.response.status, 200);
  assert.ok(adminComplaints.body.data.some((item) => item._id === complaint._id));

  const reviewedPriority = await request(
    `/api/v1/admin/complaints/${complaint._id}/priority`,
    {
      method: "PATCH",
      headers: authHeader(adminToken),
      body: JSON.stringify({ priority: "high" }),
    },
  );
  assert.equal(reviewedPriority.response.status, 200);
  assert.equal(reviewedPriority.body.data.priorityLabel, "high");

  const workers = await request("/api/v1/admin/workers", {
    headers: authHeader(adminToken),
  });
  assert.equal(workers.response.status, 200);
  assert.ok(workers.body.data.some((worker) => worker._id === workerId));

  const assignWorker = await request(`/api/v1/complaint/${complaint._id}/assign`, {
    method: "PATCH",
    headers: authHeader(adminToken),
    body: JSON.stringify({ workerId }),
  });
  assert.equal(assignWorker.response.status, 200);
  assert.equal(assignWorker.body.data.status, "assigned");

  const workerLogin = await request("/api/v1/worker/login", {
    method: "POST",
    body: JSON.stringify({ email: emails.worker, password }),
  });
  assert.equal(workerLogin.response.status, 200);
  const workerToken = workerLogin.body.data.accessToken;

  const workerComplaints = await request("/api/v1/worker/complaints", {
    headers: authHeader(workerToken),
  });
  assert.equal(workerComplaints.response.status, 200);
  assert.equal(workerComplaints.body.data.length, 1);

  const workerStatus = await request(`/api/v1/worker/complaints/${complaint._id}/status`, {
    method: "PATCH",
    headers: authHeader(workerToken),
    body: JSON.stringify({ status: "in_progress" }),
  });
  assert.equal(workerStatus.response.status, 200);
  assert.equal(workerStatus.body.data.status, "in_progress");

  const missingCompletionImage = await request(
    `/api/v1/worker/complaints/${complaint._id}/complete`,
    {
      method: "PATCH",
      headers: authHeader(workerToken),
      body: JSON.stringify({}),
    },
  );
  assert.equal(missingCompletionImage.response.status, 400);

  const adminResolve = await request(`/api/v1/admin/complaints/${complaint._id}/status`, {
    method: "PATCH",
    headers: authHeader(adminToken),
    body: JSON.stringify({ status: "resolved" }),
  });
  assert.equal(adminResolve.response.status, 200);
  assert.equal(adminResolve.body.data.status, "resolved");

  const notifications = await request("/api/v1/notifications", {
    headers: authHeader(studentToken),
  });
  assert.equal(notifications.response.status, 200);
  assert.ok(notifications.body.data.notifications.length >= 1);
  const notificationId = notifications.body.data.notifications[0]._id;

  const markRead = await request(`/api/v1/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: authHeader(studentToken),
  });
  assert.equal(markRead.response.status, 200);
  assert.equal(markRead.body.data.read, true);

  const unread = await request("/api/v1/notifications/unread-count", {
    headers: authHeader(studentToken),
  });
  assert.equal(unread.response.status, 200);
  assert.ok(Number.isInteger(unread.body.data.unreadCount));

  const markAllRead = await request("/api/v1/notifications/mark-all/read", {
    method: "PATCH",
    headers: authHeader(studentToken),
  });
  assert.equal(markAllRead.response.status, 200);

  const deleteNotification = await request(`/api/v1/notifications/${notificationId}`, {
    method: "DELETE",
    headers: authHeader(studentToken),
  });
  assert.equal(deleteNotification.response.status, 200);

  const deleteAllNotifications = await request("/api/v1/notifications", {
    method: "DELETE",
    headers: authHeader(studentToken),
  });
  assert.equal(deleteAllNotifications.response.status, 200);

  const persistedComplaint = await Complaint.findById(complaint._id).lean();
  assert.equal(persistedComplaint.status, "resolved");
  assert.equal(String(persistedComplaint.assignedWorker), workerId);

  const studentLogout = await request("/api/v1/student/logout", {
    method: "POST",
    headers: authHeader(studentToken),
  });
  assert.equal(studentLogout.response.status, 200);

  const workerLogout = await request("/api/v1/worker/logout", {
    method: "POST",
    headers: authHeader(workerToken),
  });
  assert.equal(workerLogout.response.status, 200);

  const adminLogout = await request("/api/v1/admin/logout", {
    method: "POST",
    headers: authHeader(adminToken),
  });
  assert.equal(adminLogout.response.status, 200);
});
