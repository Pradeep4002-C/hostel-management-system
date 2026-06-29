import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { env } from "../config/env.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const cookieToken =
      typeof req.cookies?.accessToken === "string"
        ? req.cookies.accessToken.trim()
        : "";
    const authHeader = req.header("Authorization");
    const headerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
    const token = cookieToken || headerToken;

    if (!token || ["undefined", "null"].includes(token.toLowerCase())) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, env.accessTokenSecret);

    const user = await User.findById(decodedToken?._id).select("-password");

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
