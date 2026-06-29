import connectDB from "./db/index.js";
import { app } from "./app.js";
import { createAdmin } from "./seed/admin.seed.js";
import { env, validateEnv } from "./config/env.js";
import { logger } from "./utils/logger.js";

validateEnv();

connectDB()
  .then(async () => {
    await createAdmin();
    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    });
  })
  .catch((error) => {
    logger.error("MongoDB connection failed", error);
    process.exit(1);
  });
