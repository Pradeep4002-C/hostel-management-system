import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";
import { env } from "./env.js";
import { ApiError } from "../utils/ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const removeLocalFile = (localFilePath) => {
  if (!localFilePath) return Promise.resolve();
  return fs.unlink(localFilePath).catch(() => undefined);
};

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

const storeLocalUpload = async (localFilePath) => {
  const uploadsDirectory = path.resolve("public", "uploads");
  await fs.mkdir(uploadsDirectory, { recursive: true });

  const fileName = path.basename(localFilePath);
  const destination = path.join(uploadsDirectory, fileName);
  await fs.rename(localFilePath, destination);

  return {
    url: `/uploads/${fileName}`,
    secure_url: `/uploads/${fileName}`,
    storage: "local",
  };
};

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    if (!isCloudinaryConfigured()) {
      if (env.isProduction) {
        throw new ApiError(503, "Image upload provider is not configured");
      }

      return storeLocalUpload(localFilePath);
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
      folder: "hostelcare/complaints",
    });

    await removeLocalFile(localFilePath);
    return response;
  } catch (error) {
    if (!env.isProduction && !(error instanceof ApiError)) {
      return storeLocalUpload(localFilePath);
    }

    await removeLocalFile(localFilePath);
    throw error instanceof ApiError
      ? error
      : new ApiError(502, "Image upload provider failed");
  }
};

export { uploadOnCloudinary };
