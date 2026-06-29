import { Router } from "express";
import {
  loginWorker,
  logoutWorker,
  getAssignedComplaints,
  updateComplaintStatus,
  uploadCompletionImage,
} from "../controllers/worker.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import {
  createRateLimiter,
  validateUploadedImage,
} from "../middleware/security.middleware.js";

const workerRouter = Router();
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many login attempts. Please try again later.",
});

workerRouter.post("/login", loginLimiter, loginWorker);
workerRouter.post("/logout", verifyJWT, logoutWorker);

workerRouter.get("/complaints", verifyJWT, getAssignedComplaints);

workerRouter.patch(
  "/complaints/:complaintId/status",
  verifyJWT,
  updateComplaintStatus,
);

workerRouter.patch(
  "/complaints/:complaintId/complete",
  verifyJWT,
  upload.single("image"),
  validateUploadedImage,
  uploadCompletionImage,
);

export default workerRouter;
