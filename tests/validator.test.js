import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateEmail } from "../validator.js";

const validEmail = {
  from: "sender@example.com",
  to: "receiver@example.com",
  subject: "Hello",
  message: "World",
};

describe("validator", () => {
  it("passes for all required fields", () => {
    assert.doesNotThrow(() => validateEmail(validEmail));
  });

  for (const field of ["from", "to", "subject", "message"]) {
    it(`throws when ${field} is missing`, () => {
      const input = { ...validEmail };
      delete input[field];
      assert.throws(
        () => validateEmail(input),
        new RegExp(`Missing required field: ${field}`)
      );
    });
  }

  it("throws for an empty string field", () => {
    assert.throws(() => validateEmail({ ...validEmail, subject: "" }));
  });
});
