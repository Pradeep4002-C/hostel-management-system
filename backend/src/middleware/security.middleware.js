import fs from "fs/promises";
import { ApiError } from "../utils/ApiError.js";

const securityHeaders = (_, res, next) => {
  res.set({
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  next();
};

const createRateLimiter = ({ windowMs, max, message }) => {
  const attempts = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of attempts) {
      if (value.resetAt <= now) attempts.delete(key);
    }
  }, windowMs);
  cleanup.unref?.();

  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const current = attempts.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    entry.count += 1;
    attempts.set(key, entry);
    res.set("RateLimit-Remaining", String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      next(new ApiError(429, message));
      return;
    }

    next();
  };
};

const imageSignatures = [
  { mime: "image/jpeg", matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { mime: "image/png", matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", matches: (bytes) => bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP" },
];

const validateUploadedImage = async (req, _, next) => {
  if (!req.file?.path) {
    next();
    return;
  }

  try {
    const handle = await fs.open(req.file.path, "r");
    const bytes = Buffer.alloc(12);
    await handle.read(bytes, 0, bytes.length, 0);
    await handle.close();

    const signature = imageSignatures.find(({ mime }) => mime === req.file.mimetype);
    if (!signature?.matches(bytes)) {
      await fs.unlink(req.file.path).catch(() => undefined);
      next(new ApiError(400, "Uploaded file content is not a valid image"));
      return;
    }

    next();
  } catch {
    await fs.unlink(req.file.path).catch(() => undefined);
    next(new ApiError(400, "Unable to validate uploaded image"));
  }
};

export { createRateLimiter, securityHeaders, validateUploadedImage };
