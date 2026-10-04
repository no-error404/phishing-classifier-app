/**
 * Pure confusion-matrix metrics.
 * Returns 0 for any metric whose denominator is zero.
 */
function scoreMatrix(tp, fp, tn, fn) {
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const accuracy = tp + fp + tn + fn > 0
    ? (tp + tn) / (tp + fp + tn + fn)
    : 0;
  const f1 = precision + recall > 0
    ? 2 * ((precision * recall) / (precision + recall))
    : 0;

  return { precision, recall, f1, accuracy };
}

export { scoreMatrix };
