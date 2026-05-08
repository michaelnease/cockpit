import { deriveStatus, summarize } from "./status.js";
import type { CheckResult, ReadinessReport } from "./types.js";

export function buildReport(environment: string, results: CheckResult[], generatedAt = new Date()): ReadinessReport {
  return {
    environment,
    generatedAt: generatedAt.toISOString(),
    status: deriveStatus(results),
    totals: summarize(results),
    results
  };
}
