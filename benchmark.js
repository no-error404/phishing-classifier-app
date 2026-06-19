import { readFile } from 'fs/promises';
import { classifyEmail } from './classifier.js';
import path from 'path';

async function runBenchmark() {
// 1. Load and parse the benchmark emails from the JSON file
const filePath = path.join(import.meta.dirname, 'emails.json');    
const rawData = await readFile(filePath, 'utf-8');
const emails = JSON.parse(rawData).slice(0, 20); // Limit to 20 emails for testing

// 2. Initialize counters for classification results
let truePositive = 0;
let falsePositive = 0;
let trueNegative = 0;
let falseNegative = 0;

// 3. Iterate through each email and classify it
for (const email of emails) {
    console.log(`Classifying email from: ${email.from}, subject: ${email.subject}`);

    try{
        //try get a prediction from the classifier
    const prediction = await classifyEmail(email);
    const predictedLabel = prediction.classification;
    const actualLabel = email.label;

    // 4. Update counters based on the prediction and actual label
    if (predictedLabel === "PHISHING" && actualLabel === "PHISHING") {
        truePositive++;
    } else if (predictedLabel === "PHISHING" && actualLabel === "LEGITIMATE") {
        falsePositive++;
    } else if (predictedLabel === "LEGITIMATE" && actualLabel === "LEGITIMATE") {
        trueNegative++;
    } else if (predictedLabel === "LEGITIMATE" && actualLabel === "PHISHING") {
        falseNegative++;
    }
} catch (error) {
    console.error(`Error classifying email from: ${email.from}, subject: ${email.subject}`, error);
}}

// 5. Log the classification result for each email
console.log(`TP: ${truePositive}, FP: ${falsePositive}, TN: ${trueNegative}, FN: ${falseNegative}`);

// 🎯 Precision: Out of all the emails we *flagged* as phishing, how many actually were?
const precision = (truePositive + falsePositive) > 0 
    ? truePositive / (truePositive + falsePositive) 
    : 0;

// 🕵️ Recall: Out of all the *actual* phishing emails, how many did we catch?
const recall = (truePositive + falseNegative) > 0 
    ? truePositive / (truePositive + falseNegative) 
    : 0;

// ⚖️ F1 Score: The balance between Precision and Recall
const f1 = (precision + recall) > 0 
    ? 2 * ((precision * recall) / (precision + recall)) 
    : 0;

// Convert decimals to formatted percentage strings
const precisionPercent = (precision * 100).toFixed(2);
const recallPercent = (recall * 100).toFixed(2);
const f1Percent = (f1 * 100).toFixed(2);

console.log(`\n--- Benchmark Results ---`);
console.log(`Precision: ${precisionPercent}%`);
console.log(`Recall:    ${recallPercent}%`);
console.log(`F1 Score:  ${f1Percent}%`);
}
runBenchmark()
