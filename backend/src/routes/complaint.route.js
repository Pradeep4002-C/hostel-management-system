import { Router } from "express";
import {
  createComplaint,
  assignWorker,
} from "../controllers/complaint.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { validateUploadedImage } from "../middleware/security.middleware.js";

const complaintRouter = Router();

complaintRouter
  .route("/")
  .post(verifyJWT, upload.single("image"), validateUploadedImage, createComplaint);

complaintRouter.patch("/:complaintId/assign", verifyJWT, assignWorker);

export default complaintRouter;
