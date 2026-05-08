import type { CheckResult, ReadinessReport } from "../core/types.js";

const statusLabels = {
  pass: "PASS",
  warn: "WARN",
  fail: "FAIL",
  skip: "SKIP"
} as const;

export function renderTerminalReport(report: ReadinessReport): string {
  const lines = [
    "Northwind Deployment Cockpit",
    `Environment: ${report.environment}`,
    `Generated: ${report.generatedAt}`,
    "",
    `Overall: ${report.status.toUpperCase()}`,
    ""
  ];

  for (const result of report.results) {
    lines.push(formatResultLine(result));
  }

  lines.push(
    "",
    "Summary:",
    `Pass: ${report.totals.pass}`,
    `Warn: ${report.totals.warn}`,
    `Fail: ${report.totals.fail}`,
    `Skip: ${report.totals.skip}`
  );

  const blockers = report.results.filter((result) => result.status === "fail");
  if (blockers.length > 0) {
    lines.push("", "Blocked by:");
    for (const blocker of blockers) {
      lines.push(`- ${blocker.summary}`);
      if (blocker.remediation) lines.push(`  Fix: ${blocker.remediation}`);
    }
  }

  return lines.join("\n");
}

export function formatResultLine(result: CheckResult): string {
  return `${statusLabels[result.status].padEnd(5)} ${result.category.toUpperCase().padEnd(10)} ${result.title}`;
}
