import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runBenchmark, parseCountArg, writeReport } from "../benchmark.js";

const fixtureEmails = [
  { from: "a@example.com", to: "b@example.com", subject: "s1", message: "m1", label: "LEGITIMATE" },
  { from: "c@example.com", to: "d@example.com", subject: "s2", message: "m2", label: "PHISHING" },
];

describe("benchmark helpers", () => {
  it("parseCountArg accepts 'all'", () => {
    assert.equal(parseCountArg("all"), "all");
    assert.equal(parseCountArg(undefined), "all");
  });

  it("parseCountArg accepts positive integers", () => {
    assert.equal(parseCountArg("20"), 20);
    assert.equal(parseCountArg("4780"), 4780);
  });

  it("parseCountArg rejects invalid values", () => {
    for (const bad of ["0", "-5", "abc", "3.5"]) {
      assert.throws(() => parseCountArg(bad), /Invalid count argument/);
    }
  });
});

describe("writeReport", () => {
  let tempDir;

  before(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "benchmark-report-"));
  });

  after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("writes a dated JSON report to the given directory", async () => {
    const originalDir = (await import("../benchmark.js")).REPORT_DIR;
    const report = {
      timestamp: new Date().toISOString(),
      total: 2,
      classified: 2,
      errors: 0,
      counts: { truePositive: 1, falsePositive: 0, trueNegative: 1, falseNegative: 0 },
      metrics: { precision: 1, recall: 1, f1: 1, accuracy: 1 },
      percentages: {},
      details: [],
    };

    const reportPath = await writeReport(report, tempDir);
    assert.ok(path.basename(reportPath).startsWith("benchmark-"));
    assert.ok(reportPath.endsWith(".json"));

    const written = JSON.parse(await readFile(reportPath, "utf-8"));
    assert.equal(written.total, 2);
  });
});

describe("runBenchmark with mocked classifier", () => {
  it("classifies fixture emails and produces a report", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "benchmark-data-"));
    const fixturePath = path.join(tempDir, "emails.json");
    await writeFile(fixturePath, JSON.stringify(fixtureEmails));

    const fetcher = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ classification: "PHISHING", confidence: 90, reason: "mock" }) } }],
      }),
    });

    const { report } = await runBenchmark({
      count: 2,
      dataFile: fixturePath,
      classifierOptions: { fetcher },
    });

    await rm(tempDir, { recursive: true, force: true });

    assert.equal(report.total, 2);
    assert.equal(report.classified, 2);
    assert.equal(report.errors, 0);
    assert.equal(report.counts.falsePositive, 1);
    assert.equal(report.counts.truePositive, 1);
    assert.equal(report.metrics.precision, 0.5);
  });

  it("continues when individual classifications fail", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "benchmark-data-"));
    const fixturePath = path.join(tempDir, "emails.json");
    await writeFile(fixturePath, JSON.stringify(fixtureEmails));

    let calls = 0;
    const fetcher = async () => {
      calls++;
      if (calls === 1) throw new Error("model down");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ classification: "LEGITIMATE", confidence: 50, reason: "ok" }) } }],
        }),
      };
    };

    const { report } = await runBenchmark({
      count: 2,
      dataFile: fixturePath,
      classifierOptions: { fetcher },
    });

    await rm(tempDir, { recursive: true, force: true });

    assert.equal(report.errors, 1);
    assert.equal(report.classified, 1);
  });
});
