import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyEmail, ClassificationError } from "../classifier.js";

const validEmail = {
  from: "alice@example.com",
  to: "bob@example.com",
  subject: "Invoice attached",
  message: "Please review the attached invoice.",
};

function makeMockFetcher({ responseBody, status = 200, ok = true } = {}) {
  return async (_url, options) => {
    return {
      ok,
      status,
      json: async () => responseBody,
    };
  };
}

describe("classifyEmail", () => {
  it("validates input before calling the model", async () => {
    const fetcher = makeMockFetcher({
      responseBody: {
        choices: [
          { message: { content: JSON.stringify({ classification: "LEGITIMATE", confidence: 80, reason: "ok" }) } },
        ],
      },
    });

    await assert.rejects(
      () => classifyEmail({ to: "bob@example.com", subject: "x", message: "y" }, { fetcher }),
      /Missing required field: from/
    );
  });

  it("returns parsed JSON from a mock fetcher", async () => {
    const expected = { classification: "PHISHING", confidence: 92, reason: "Suspicious sender" };
    const fetcher = makeMockFetcher({
      responseBody: {
        choices: [{ message: { content: JSON.stringify(expected) } }],
      },
    });

    const result = await classifyEmail(validEmail, { fetcher });
    assert.deepEqual(result, expected);
  });

  it("throws a structured error on HTTP error status", async () => {
    const fetcher = makeMockFetcher({ status: 503, ok: false });
    let caught;
    await assert.rejects(
      () => classifyEmail(validEmail, { fetcher }).catch((e) => { caught = e; throw e; }),
      (error) => error instanceof ClassificationError && error.type === "MODEL_HTTP_ERROR"
    );
    assert.equal(caught.type, "MODEL_HTTP_ERROR");
    assert.ok(caught.message.includes("503"));
  });

  it("throws structured error when response is not valid JSON", async () => {
    const fetcher = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    let caught;
    await assert.rejects(
      () => classifyEmail(validEmail, { fetcher }).catch((e) => { caught = e; throw e; }),
      (error) => error instanceof ClassificationError && error.type === "MODEL_INVALID_JSON"
    );
    assert.equal(caught.type, "MODEL_INVALID_JSON");
  });

  it("throws structured error when model content is non-JSON", async () => {
    const fetcher = makeMockFetcher({
      responseBody: { choices: [{ message: { content: "not json" } }] },
    });

    let caught;
    await assert.rejects(
      () => classifyEmail(validEmail, { fetcher }).catch((e) => { caught = e; throw e; }),
      (error) => error instanceof ClassificationError && error.type === "MODEL_INVALID_JSON"
    );
    assert.equal(caught.type, "MODEL_INVALID_JSON");
  });

  it("throws structured error when JSON schema is invalid", async () => {
    const fetcher = makeMockFetcher({
      responseBody: {
        choices: [{ message: { content: JSON.stringify({ confidence: 50 }) } }],
      },
    });

    let caught;
    await assert.rejects(
      () => classifyEmail(validEmail, { fetcher }).catch((e) => { caught = e; throw e; }),
      (error) => error instanceof ClassificationError && error.type === "MODEL_INVALID_SCHEMA"
    );
    assert.equal(caught.type, "MODEL_INVALID_SCHEMA");
  });

  it("uses injected baseUrl and model options", async () => {
    let requestedUrl;
    let requestBody;
    const fetcher = async (url, options) => {
      requestedUrl = url;
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ classification: "LEGITIMATE", confidence: 70, reason: "ok" }) } }],
        }),
      };
    };

    await classifyEmail(validEmail, { fetcher, baseUrl: "http://custom.local", model: "custom-model" });
    assert.equal(requestedUrl, "http://custom.local/v1/chat/completions");
    assert.equal(requestBody.model, "custom-model");
  });
});
