import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js";
import { env } from "./config/env.js";
import multer from "multer";
import fs from "fs";
import { securityHeaders } from "./middleware/security.middleware.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.isProduction ? 1 : false);
app.use(securityHeaders);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new ApiError(403, "CORS origin is not allowed"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/health", (_, res) => {
  res.status(200).json({
    success: true,
    message: "Service healthy",
  });
});

import studentRouter from "./routes/student.route.js";

app.use("/api/v1/student", studentRouter);

import adminRouter from "./routes/admin.route.js";

app.use("/api/v1/admin", adminRouter);

import complaintRouter from "./routes/complaint.route.js";

app.use("/api/v1/complaint", complaintRouter);

import workerRouter from "./routes/worker.route.js";

app.use("/api/v1/worker", workerRouter);

import notificationRouter from "./routes/notification.route.js";

app.use("/api/v1/notifications", notificationRouter);

app.use((req, _, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

app.use((error, _, res, __) => {
  if (_?.file?.path) {
    try {
      fs.unlinkSync(_.file.path);
    } catch {
      // The upload was already moved or removed.
    }
  }

  const statusCode =
    error instanceof multer.MulterError
      ? error.code === "LIMIT_FILE_SIZE"
        ? 413
        : 400
      : error?.name === "ValidationError" || error?.name === "CastError"
        ? 400
        : error?.code === 11000
          ? 409
          : error.statusCode || 500;
  const isServerError = statusCode >= 500;

  res.status(statusCode).json({
    success: false,
    message:
      env.isProduction && isServerError
        ? "Internal server error"
        : error?.code === 11000
          ? "A record with those details already exists"
          : error.message || "Internal server error",
    errors: error.errors || [],
  });
});

export { app };
