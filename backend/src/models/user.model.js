import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: 254,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 128,
    },

    phoneNumber: {
      type: String,
      trim: true,
      maxlength: 20,
    },

    role: {
      type: String,
      enum: ["student", "admin", "worker"],
      default: "student",
    },
    workerType: {
      type: String,
      enum: [
        "electrical",
        "plumbing",
        "carpentry",
        "cleaning",
        "carpenter",
        "cleaner",
        "other",
      ],
    },
    hostelBlock: {
      type: String,
      trim: true,
      maxlength: 20,
    },

    roomNumber: {
      type: String,
      trim: true,
      maxlength: 20,
    },

  },
  { timestamps: true },
);

// hash password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

// check password
userSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};

// generate access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
    },
    env.accessTokenSecret,
    {
      expiresIn: env.accessTokenExpiry,
    },
  );
};

export const User = mongoose.model("User", userSchema);
