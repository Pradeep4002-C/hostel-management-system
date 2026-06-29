import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const tempDirectory = path.resolve("public", "temp");
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdirSync(tempDirectory, { recursive: true });
    cb(null, tempDirectory);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${extension.toLowerCase()}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
      return;
    }

    cb(null, true);
  },
});
