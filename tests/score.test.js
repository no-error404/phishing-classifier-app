import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreMatrix } from "../score.js";

describe("scoreMatrix", () => {
  it("returns known metrics for a 2x2 confusion matrix", () => {
    // TP=7, FP=2, TN=5, FN=1
    // precision = 7/9 = 0.777777...
    // recall    = 7/8 = 0.875
    // accuracy  = 12/15 = 0.8
    // f1        = 2*(0.7777...*0.875)/(0.7777...+0.875) = ~0.8235
    const result = scoreMatrix(7, 2, 5, 1);
    assert.equal(result.precision, 7 / 9);
    assert.equal(result.recall, 7 / 8);
    assert.equal(result.accuracy, 12 / 15);
    assert.ok(Math.abs(result.f1 - 0.8235294117647058) < 1e-9);
  });

  it("returns zeros when all inputs are zero", () => {
    const result = scoreMatrix(0, 0, 0, 0);
    assert.equal(result.precision, 0);
    assert.equal(result.recall, 0);
    assert.equal(result.f1, 0);
    assert.equal(result.accuracy, 0);
  });

  it("returns zero precision when TP+FP is zero", () => {
    const result = scoreMatrix(0, 0, 5, 3);
    assert.equal(result.precision, 0);
    assert.equal(result.recall, 0);
    assert.equal(result.f1, 0);
    assert.equal(result.accuracy, 5 / 8);
  });

  it("returns zero recall when TP+FN is zero", () => {
    const result = scoreMatrix(0, 4, 6, 0);
    assert.equal(result.precision, 0);
    assert.equal(result.recall, 0);
    assert.equal(result.f1, 0);
    assert.equal(result.accuracy, 6 / 10);
  });

  it("returns perfect metrics for a clean prediction", () => {
    const result = scoreMatrix(10, 0, 10, 0);
    assert.equal(result.precision, 1);
    assert.equal(result.recall, 1);
    assert.equal(result.f1, 1);
    assert.equal(result.accuracy, 1);
  });
});
