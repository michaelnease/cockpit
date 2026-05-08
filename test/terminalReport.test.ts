import { buildReport } from "../src/core/report.js";
import type { CheckResult } from "../src/core/types.js";
import { renderTerminalReport } from "../src/render/terminalReport.js";

describe("terminal renderer", () => {
  it("groups status totals and blockers", () => {
    const results: CheckResult[] = [
      { id: "1", title: "Cluster exists", category: "ecs", status: "pass", summary: "ok" },
      { id: "2", title: "Admin failed", category: "http", status: "fail", summary: "Admin returned 500", remediation: "Check ECS logs." }
    ];

    const rendered = renderTerminalReport(buildReport("prod", results, new Date("2026-05-07T00:00:00Z")));

    expect(rendered).toContain("Overall: BLOCKED");
    expect(rendered).toContain("PASS  ECS");
    expect(rendered).toContain("Fail: 1");
    expect(rendered).toContain("Blocked by:");
    expect(rendered).toContain("Fix: Check ECS logs.");
  });
});
