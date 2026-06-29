import { Router } from "express";
import {
  loginStudent,
  registerStudent,
  logoutStudent,
  getMyComplaints,
} from "../controllers/student.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/security.middleware.js";

const router = Router();
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts. Please try again later.",
});

router.route("/register").post(authLimiter, registerStudent);

router.route("/login").post(authLimiter, loginStudent);

router.route("/logout").post(verifyJWT, logoutStudent);

router.get("/complaints", verifyJWT, getMyComplaints);

export default router;
