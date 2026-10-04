import { validateEmail } from "./validator.js";

const DEFAULT_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3:instruct";
const DEFAULT_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `You are an email classifier. Classify the provided email as either PHISHING or LEGITIMATE. Output only raw JSON and nothing else. Respond with valid JSON: {"classification": "PHISHING"|"LEGITIMATE", "confidence": 0-100, "reason": "a brief explanation"}`;

class ClassificationError extends Error {
  constructor(type, message, cause = null) {
    super(message);
    this.type = type;
    this.cause = cause;
  }
}

function buildEmailText(emailInput) {
  return `From: ${emailInput.from}
To: ${emailInput.to}
Subject: ${emailInput.subject}

${emailInput.message}`;
}

function buildPayload(emailText, model) {
  return {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: emailText },
    ],
    stream: false,
    format: "json",
  };
}

async function classifyEmail(emailInput, options = {}) {
  validateEmail(emailInput);

  const fetcher = options.fetcher || globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const model = options.model || DEFAULT_MODEL;

  const emailText = buildEmailText(emailInput);
  const payload = buildPayload(emailText, model);
  const url = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (cause) {
    clearTimeout(timeoutId);
    throw new ClassificationError(
      "NETWORK_ERROR",
      `Failed to reach classifier model at ${url}: ${cause?.message || cause}`,
      cause
    );
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new ClassificationError(
      "MODEL_HTTP_ERROR",
      `Classifier model returned HTTP ${response.status}`,
      { status: response.status }
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (cause) {
    throw new ClassificationError(
      "MODEL_INVALID_JSON",
      "Classifier model response was not valid JSON",
      cause
    );
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new ClassificationError(
      "MODEL_INVALID_JSON",
      "Classifier model response missing expected message content"
    );
  }

  try {
    const parsed = JSON.parse(content);
    if (
      !["PHISHING", "LEGITIMATE"].includes(parsed.classification) ||
      typeof parsed.confidence !== "number" ||
      typeof parsed.reason !== "string"
    ) {
      throw new ClassificationError(
        "MODEL_INVALID_SCHEMA",
        `Classifier returned JSON with unexpected schema: ${content}`
      );
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof ClassificationError) {
      throw cause;
    }
    throw new ClassificationError(
      "MODEL_INVALID_JSON",
      `Classifier returned non-JSON content: ${content}`,
      cause
    );
  }
}

export { classifyEmail, ClassificationError };
