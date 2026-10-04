# Phishing Email Classifier

A local-LLM email classifier that labels messages as **PHISHING** or **LEGITIMATE**. It includes a standalone library, a pure-Node.js web UI, a benchmark runner, and a test suite that mocks the model so everything stays testable without a live Ollama instance.

## What it does

- Takes an email-like object `{from, to, subject, message}`.
- Sends it to an OpenAI-compatible chat endpoint (default: Ollama `llama3:instruct` at `http://localhost:11434`).
- Parses the model's JSON response into `{classification, confidence, reason}`.
- Exposes a web form and a JSON API for ad-hoc classification.
- Benchmarks the model against `emails.json` and writes dated reports to `benchmark-results/`.

## Architecture

```text
classifier.js   → core library; validates input, calls the LLM, parses JSON
validator.js    → input validation
score.js        → pure confusion-matrix metrics
benchmark.js    → dataset loop + report writer (argv-driven)
server.js       → node:http server + API + static HTML
public/         → self-contained UI
preprocess.js   → builds emails.json from raw sources (kept as-is; not run here)
tests/          → node:test suite with mocked fetchers
```

`classifyEmail` accepts an injected `fetcher`, plus optional `baseUrl`, `model`, and `timeoutMs`. This seam keeps the library testable and makes it straightforward to add a **retrieval-augmented** step later.

## Getting started

```bash
npm install
```

### Tests (no live model)

```bash
npm test
```

The suite uses the built-in `node:test` runner and mocked `fetch` implementations, so it passes even when Ollama is not running.

### Web UI

```bash
npm run serve
# open http://localhost:3000
```

Set `PORT` to change the listening port:

```bash
PORT=8080 npm run serve
```

### Benchmark

```bash
# 20 emails, quick smoke test
npm run benchmark:smoke

# full dataset (4780 emails)
npm run benchmark:all
```

A dated report is written to `benchmark-results/` for every run. The loop catches per-email errors and continues, so a down model does not crash the benchmark.

## Configuration

| Variable            | Default                              | Purpose                    |
|---------------------|--------------------------------------|----------------------------|
| `OLLAMA_BASE_URL`   | `http://localhost:11434`             | Base URL of the LLM server |
| `OLLAMA_MODEL`      | `llama3:instruct`                    | Chat model name            |
| `PORT`              | `3000`                               | Web server port            |

These can also be overridden per-call via `classifyEmail(email, { baseUrl, model, timeoutMs, fetcher })`.

## API contract

### Request

`POST /api/classify`

```json
{
  "from": "sender@example.com",
  "to": "recipient@example.com",
  "subject": "Subject line",
  "message": "Email body"
}
```

### Success response

```json
{
  "classification": "PHISHING",
  "confidence": 92,
  "reason": "Requests credentials from an unrecognized sender"
}
```

### Error responses

- `400` — missing required field (`from`, `to`, `subject`, or `message`)
- `502` — classifier model is unreachable or returned an error
- `500` — unexpected server error

## Benchmark output

Reports include:

- total, classified, and error counts
- confusion-matrix counts (TP, FP, TN, FN)
- precision, recall, F1, and accuracy as decimals and percentages
- per-email details (actual label, prediction, confidence, any error)

Metrics are computed by a pure function and return `0` for any zero-division case.

## Runtime requirement

A live Ollama (or any OpenAI-compatible `/v1/chat/completions` endpoint) is required for the real classifier to work. Tests and the web UI's automated test path use mocks, but local inference only happens when `npm run serve` or `npm run benchmark:*` hit the configured endpoint.

## Planned: RAG over email datasets

Future work will add retrieval-augmented classification: before the LLM prompt is built, a retriever will fetch the most similar examples from `emails.json` and inject them into the prompt as in-context demonstrations.

The current code is already structured for this:

- `classifyEmail` is the only place that builds and sends the prompt; a `retriever` can be added to `options` and called inside `buildEmailText` or before payload construction.
- The input/output contract stays unchanged, so the UI, API, and benchmark can adopt retrieval without changes.
- `classifierOptions` in `benchmark.js` provides a clean injection point for plugging in a retriever during evaluation.

No RAG implementation is included yet; this note documents the intended extension and the seam that supports it.
