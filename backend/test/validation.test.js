import assert from "node:assert/strict";
import test from "node:test";
import {
  getMissingRequiredFields,
  isStrongEnoughPassword,
  isValidEmail,
  isValidPhoneNumber,
  normalizeTrimmedFields,
} from "../src/validators/request.validator.js";

test("normalizes string request fields without changing non-strings", () => {
  const normalized = normalizeTrimmedFields({
    email: " User@Example.com ",
    count: 3,
  });

  assert.deepEqual(normalized, {
    email: "User@Example.com",
    count: 3,
  });
});

test("detects missing required string fields", () => {
  const missing = getMissingRequiredFields({
    title: "Fan broken",
    description: " ",
    category: "",
  });

  assert.deepEqual(missing, ["description", "category"]);
});

test("validates authentication input primitives", () => {
  assert.equal(isValidEmail("student@example.com"), true);
  assert.equal(isValidEmail("student@@example"), false);
  assert.equal(isStrongEnoughPassword("longpass"), true);
  assert.equal(isStrongEnoughPassword("short"), false);
  assert.equal(isValidPhoneNumber("+91 98765 43210"), true);
  assert.equal(isValidPhoneNumber("abc123"), false);
});
