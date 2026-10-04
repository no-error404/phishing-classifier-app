import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { startServer } from "../server.js";

function request(port, path, body, method = "POST") {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe("server", () => {
  let server;
  let port;

  before(async () => {
    const mockFetcher = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ classification: "PHISHING", confidence: 95, reason: "mock" }) } }],
      }),
    });

    server = startServer({ fetcher: mockFetcher });
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it("GET / returns the index HTML", async () => {
    const res = await request(port, "/", null, "GET");
    assert.equal(res.status, 200);
    assert.ok(res.body.includes("Email Classifier"));
  });

  it("POST /api/classify returns classification with mocked fetcher", async () => {
    const res = await request(port, "/api/classify", {
      from: "attacker@evil.com",
      to: "user@example.com",
      subject: "Urgent",
      message: "Click here now",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.classification, "PHISHING");
    assert.equal(res.body.confidence, 95);
    assert.equal(res.body.reason, "mock");
  });

  it("POST /api/classify returns 400 on missing fields", async () => {
    const res = await request(port, "/api/classify", {
      from: "attacker@evil.com",
      to: "user@example.com",
      subject: "Urgent",
      // message missing
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes("Missing required field"));
  });

  it("POST /api/classify returns 502 when model is unreachable", async () => {
    const downServer = startServer({ fetcher: async () => { throw new Error("connection refused"); } });
    let downPort;
    await new Promise((resolve) => {
      downServer.listen(0, "127.0.0.1", () => {
        downPort = downServer.address().port;
        resolve();
      });
    });

    const res = await request(downPort, "/api/classify", {
      from: "a@b.com",
      to: "c@d.com",
      subject: "s",
      message: "m",
    });

    assert.equal(res.status, 502);
    assert.ok(res.body.error.includes("model") || res.body.error.includes("classifier"));

    await new Promise((resolve) => downServer.close(resolve));
  });
});
