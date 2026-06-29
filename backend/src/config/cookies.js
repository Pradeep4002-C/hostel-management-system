import { env } from "./env.js";

const authCookieOptions = {
  httpOnly: true,
  sameSite: env.isProduction ? "strict" : "lax",
  secure: env.isProduction,
};

export { authCookieOptions };
