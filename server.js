import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { classifyEmail, ClassificationError } from "./classifier.js";

const PORT = process.env.PORT || 3000;
const INDEX_HTML = path.join(import.meta.dirname, "public", "index.html");

function sendJson(res, status, body, extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...extraHeaders,
  };
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleClassify(req, res, fetcher) {
  let body;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw);
  } catch {
    return sendJson(res, 400, { error: "Invalid JSON body" });
  }

  try {
    const result = await classifyEmail(body, { fetcher });
    return sendJson(res, 200, result);
  } catch (error) {
    if (error.type === "NETWORK_ERROR") {
      return sendJson(res, 502, { error: "Classifier model is unreachable" });
    }
    if (error.message?.includes("Missing required field")) {
      return sendJson(res, 400, { error: error.message });
    }
    if (error instanceof ClassificationError) {
      return sendJson(res, 502, { error: `Classifier model error: ${error.message}` });
    }
    return sendJson(res, 500, { error: "Internal server error" });
  }
}

async function handleIndex(req, res) {
  try {
    const html = await fs.readFile(INDEX_HTML, "utf-8");
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(html);
  } catch {
    sendJson(res, 500, { error: "Failed to serve index page" });
  }
}

function createHandler(fetcher) {
  return async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      });
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/classify" && req.method === "POST") {
      return handleClassify(req, res, fetcher);
    }

    if (url.pathname === "/" && req.method === "GET") {
      return handleIndex(req, res);
    }

    return sendJson(res, 404, { error: "Not found" });
  };
}

function startServer(options = {}) {
  const fetcher = options.fetcher || globalThis.fetch;
  const server = http.createServer(createHandler(fetcher));
  return server;
}

if (import.meta.main) {
  const server = startServer();
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

export { startServer };
