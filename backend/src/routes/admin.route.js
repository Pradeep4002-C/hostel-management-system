import { Router } from "express";

import {
  createWorker,
  loginAdmin,
  logoutAdmin,
  getAllComplaints,
  updateComplaintStatus,
  updateComplaintPriority,
  getAllWorkers,
} from "../controllers/admin.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/security.middleware.js";

const adminRouter = Router();
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again later.",
});

adminRouter.route("/login").post(loginLimiter, loginAdmin);

adminRouter.route("/logout").post(verifyJWT, logoutAdmin);

adminRouter.get("/complaints", verifyJWT, getAllComplaints);

adminRouter.patch(
  "/complaints/:complaintId/status",
  verifyJWT,
  updateComplaintStatus,
);

adminRouter.patch(
  "/complaints/:complaintId/priority",
  verifyJWT,
  updateComplaintPriority,
);

adminRouter
  .route("/workers")
  .get(verifyJWT, getAllWorkers)
  .post(verifyJWT, createWorker);

export default adminRouter;
