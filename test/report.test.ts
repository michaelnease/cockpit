import { buildReport } from "../src/core/report.js";
import { deriveStatus } from "../src/core/status.js";
import type { CheckResult } from "../src/core/types.js";

const result = (status: CheckResult["status"]): CheckResult => ({
  id: status,
  title: status,
  category: "config",
  status,
  summary: status
});

describe("report status derivation", () => {
  it("marks any failure as blocked", () => {
    expect(deriveStatus([result("pass"), result("fail"), result("warn")])).toBe("blocked");
  });

  it("marks warnings without failures as attention", () => {
    expect(deriveStatus([result("pass"), result("warn")])).toBe("attention");
  });

  it("marks pass and skip reports as ready", () => {
    expect(buildReport("prod", [result("pass"), result("skip")], new Date("2026-05-07T00:00:00Z")).status).toBe("ready");
  });
});
