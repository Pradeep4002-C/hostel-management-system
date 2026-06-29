import mongoose from "mongoose";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/;
const PASSWORD_MIN_LENGTH = 8;

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const getMissingRequiredFields = (fields) =>
  Object.entries(fields)
    .filter(([, value]) => !isNonEmptyString(value))
    .map(([key]) => key);

const normalizeTrimmedFields = (fields) =>
  Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  );

const isValidEmail = (email) =>
  typeof email === "string" && EMAIL_PATTERN.test(email.trim().toLowerCase());

const isStrongEnoughPassword = (password) =>
  typeof password === "string" && password.length >= PASSWORD_MIN_LENGTH;

const isValidPhoneNumber = (phoneNumber) =>
  typeof phoneNumber === "string" && PHONE_PATTERN.test(phoneNumber.trim());

const assertValidObjectId = (value, fieldName = "id") => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }
};

export {
  PASSWORD_MIN_LENGTH,
  assertValidObjectId,
  getMissingRequiredFields,
  isStrongEnoughPassword,
  isValidEmail,
  isValidPhoneNumber,
  normalizeTrimmedFields,
};
