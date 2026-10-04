import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { classifyEmail } from "./classifier.js";
import { scoreMatrix } from "./score.js";

const DATA_FILE = path.join(import.meta.dirname, "emails.json");
const REPORT_DIR = path.join(import.meta.dirname, "benchmark-results");

function parseCountArg(arg) {
  if (!arg || arg === "all") return "all";
  const n = Number(arg);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw new Error(`Invalid count argument: ${arg}. Use a positive integer or "all".`);
  }
  return n;
}

async function writeReport(report, reportDir = REPORT_DIR) {
  await mkdir(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportDir, `benchmark-${timestamp}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

async function runBenchmark(options = {}) {
  const rawCount = options.count ?? process.argv[2] ?? "all";
  const count = parseCountArg(rawCount);

  const dataFile = options.dataFile || DATA_FILE;
  const rawData = await readFile(dataFile, "utf-8");
  let emails = JSON.parse(rawData);
  if (count !== "all") {
    emails = emails.slice(0, count);
  }

  let truePositive = 0;
  let falsePositive = 0;
  let trueNegative = 0;
  let falseNegative = 0;
  let errors = 0;
  const details = [];

  for (const email of emails) {
    const record = {
      from: email.from,
      subject: email.subject,
      actual: email.label,
      predicted: null,
      confidence: null,
      error: null,
    };

    try {
      const prediction = await classifyEmail(email, options.classifierOptions);
      const predictedLabel = prediction.classification;
      record.predicted = predictedLabel;
      record.confidence = prediction.confidence;

      if (predictedLabel === "PHISHING" && email.label === "PHISHING") {
        truePositive++;
      } else if (predictedLabel === "PHISHING" && email.label === "LEGITIMATE") {
        falsePositive++;
      } else if (predictedLabel === "LEGITIMATE" && email.label === "LEGITIMATE") {
        trueNegative++;
      } else if (predictedLabel === "LEGITIMATE" && email.label === "PHISHING") {
        falseNegative++;
      }
    } catch (error) {
      errors++;
      record.error = error.message || String(error);
    }

    details.push(record);
  }

  const metrics = scoreMatrix(truePositive, falsePositive, trueNegative, falseNegative);
  const report = {
    timestamp: new Date().toISOString(),
    total: emails.length,
    classified: emails.length - errors,
    errors,
    counts: { truePositive, falsePositive, trueNegative, falseNegative },
    metrics: {
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      accuracy: metrics.accuracy,
    },
    percentages: {
      precision: `${(metrics.precision * 100).toFixed(2)}%`,
      recall: `${(metrics.recall * 100).toFixed(2)}%`,
      f1: `${(metrics.f1 * 100).toFixed(2)}%`,
      accuracy: `${(metrics.accuracy * 100).toFixed(2)}%`,
    },
    details,
  };

  const reportPath = await writeReport(report);
  return { report, reportPath };
}

async function main() {
  const { report, reportPath } = await runBenchmark();

  console.log("\n--- Benchmark Results ---");
  console.log(`Total:      ${report.total}`);
  console.log(`Classified: ${report.classified}`);
  console.log(`Errors:     ${report.errors}`);
  console.log(`TP: ${report.counts.truePositive} | FP: ${report.counts.falsePositive} | TN: ${report.counts.trueNegative} | FN: ${report.counts.falseNegative}`);
  console.log(`Precision: ${report.percentages.precision}`);
  console.log(`Recall:    ${report.percentages.recall}`);
  console.log(`F1 Score:  ${report.percentages.f1}`);
  console.log(`Accuracy:  ${report.percentages.accuracy}`);
  console.log(`\nReport written to: ${reportPath}`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Benchmark failed:", error.message || error);
    process.exit(1);
  });
}

export { runBenchmark, parseCountArg, writeReport, scoreMatrix };
