import type { CheckResult, CheckStatus, ReadinessStatus } from "./types.js";

export function summarize(results: CheckResult[]): Record<CheckStatus, number> {
  return results.reduce<Record<CheckStatus, number>>(
    (totals, result) => {
      totals[result.status] += 1;
      return totals;
    },
    { pass: 0, warn: 0, fail: 0, skip: 0 }
  );
}

export function deriveStatus(results: CheckResult[]): ReadinessStatus {
  const totals = summarize(results);
  if (totals.fail > 0) return "blocked";
  if (totals.warn > 0) return "attention";
  return "ready";
}
