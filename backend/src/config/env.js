import dotenv from "dotenv";

dotenv.config({ path: "./.env", quiet: true });

const DEFAULT_ACCESS_TOKEN_EXPIRY = "1d";
const DEFAULT_PORT = 5001;

const requiredEnvVars = [
  "MONGO_URI",
  "ACCESS_TOKEN_SECRET",
];

const getAllowedOrigins = () =>
  (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const getEffectiveAllowedOrigins = () => {
  const origins = new Set(getAllowedOrigins());

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
  }

  return [...origins];
};

const validateEnv = () => {
  const productionEnvVars = [
    "CORS_ORIGIN",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const required = process.env.NODE_ENV === "production"
    ? [...requiredEnvVars, ...productionEnvVars]
    : requiredEnvVars;
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (process.env.NODE_ENV === "production") {
    const weakSecrets = ["ACCESS_TOKEN_SECRET"].filter(
      (key) => process.env[key].length < 32 || /replace-with/i.test(process.env[key]),
    );
    if (weakSecrets.length > 0) {
      throw new Error(`${weakSecrets.join(", ")} must be unique secrets of at least 32 characters`);
    }

    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12 || /replace-with|admin@123/i.test(process.env.ADMIN_PASSWORD)) {
      throw new Error("ADMIN_PASSWORD must be a strong password of at least 12 characters");
    }
  }
};

const env = {
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || DEFAULT_ACCESS_TOKEN_EXPIRY,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  allowedOrigins: getEffectiveAllowedOrigins(),
  databaseName: process.env.DB_NAME || "HostelManagement",
  isProduction: process.env.NODE_ENV === "production",
  mongoUri: process.env.MONGO_URI,
  port: Number(process.env.PORT) || DEFAULT_PORT,
};

export { env, validateEnv };
