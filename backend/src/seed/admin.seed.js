import { User } from "../models/user.model.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export const createAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      if (env.isProduction) {
        throw new Error(
          "ADMIN_EMAIL and ADMIN_PASSWORD are required in production"
        );
      }

      logger.info(
        "Admin seed skipped. Set ADMIN_EMAIL and ADMIN_PASSWORD to enable it."
      );
      return;
    }

    const admin = await User.findOne({ email: adminEmail });

    if (admin) {
      logger.info("Admin already exists");
      return;
    }

    await User.create({
      name: "admin",
      email: adminEmail,
      password: adminPassword,
      role: "admin",
    });

    logger.info("Admin created successfully");
  } catch (error) {
    logger.error("Error creating admin", error);
    throw error;
  }
};
