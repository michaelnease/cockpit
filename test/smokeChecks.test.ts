import { runSmokeCheck } from "../src/http/smokeChecks.js";

describe("HTTP smoke checks", () => {
  it("passes expected status and final URL", async () => {
    const fetchMock: typeof fetch = async () => new Response("ok", { status: 200, headers: { "content-type": "text/html" } });
    const result = await runSmokeCheck(
      { name: "Home", url: "https://www.northwind.ai", expectedStatus: 200, expectedFinalUrl: "https://northwind.ai/", timeoutMs: 10_000 },
      async (...args) => {
        const response = await fetchMock(...args);
        Object.defineProperty(response, "url", { value: "https://northwind.ai/" });
        return response;
      }
    );

    expect(result.status).toBe("pass");
    expect(result.details?.status).toBe(200);
  });

  it("fails on connection errors", async () => {
    const result = await runSmokeCheck(
      { name: "Admin", url: "https://admin.northwind.ai", expectedStatus: 200, timeoutMs: 10_000 },
      vi.fn(async () => {
        throw new Error("connect ECONNREFUSED");
      })
    );

    expect(result.status).toBe("fail");
    expect(result.summary).not.toContain("undefined");
  });
});
