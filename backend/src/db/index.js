import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(env.mongoUri, {
      dbName: env.databaseName,
      serverSelectionTimeoutMS: 10000,
    });
    logger.info(`MongoDB connected to ${connectionInstance.connection.host}`);
  } catch (error) {
    logger.error("MongoDB connection error", error);
    process.exit(1);
  }
};

export default connectDB;
