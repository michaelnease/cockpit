import type { EnvironmentConfig, SmokeTestConfig } from "../config/schema.js";
import type { CheckResult } from "../core/types.js";

export type FetchLike = typeof fetch;

export async function runSmokeChecks(env: EnvironmentConfig, fetchImpl: FetchLike = fetch): Promise<CheckResult[]> {
  const smokeResults =
    env.smokeTests.length === 0
      ? [{ id: "http:none", title: "No smoke tests configured", category: "http", status: "skip", summary: "No HTTP smoke tests configured." } satisfies CheckResult]
      : await Promise.all(env.smokeTests.map((test) => runSmokeCheck(test, fetchImpl)));

  const analyticsResults = await runAnalyticsChecks(env, fetchImpl);
  return [...smokeResults, ...analyticsResults];
}

export async function runSmokeCheck(test: SmokeTestConfig, fetchImpl: FetchLike = fetch): Promise<CheckResult> {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), test.timeoutMs);

  try {
    const response = await fetchImpl(test.url, { redirect: "follow", signal: controller.signal });
    const responseTimeMs = Math.round(performance.now() - started);
    const finalUrl = response.url || test.url;
    const contentType = response.headers.get("content-type") ?? undefined;
    const statusMatches = response.status === test.expectedStatus;
    const finalUrlMatches = !test.expectedFinalUrl || normalizeUrl(finalUrl) === normalizeUrl(test.expectedFinalUrl);
    const status = statusMatches && finalUrlMatches ? "pass" : response.status >= 500 ? "fail" : "warn";

    return {
      id: `http:${test.name}`,
      title: status === "pass" ? `${test.name} returned ${response.status}` : `${test.name} returned unexpected response`,
      category: "http",
      status,
      summary: buildSmokeSummary(test, response.status, finalUrl, finalUrlMatches),
      details: { url: test.url, finalUrl, expectedStatus: test.expectedStatus, status: response.status, responseTimeMs, contentType },
      remediation: status === "pass" ? undefined : "Check the application deployment, load balancer health, DNS, and recent service logs."
    };
  } catch (error) {
    return {
      id: `http:${test.name}`,
      title: `${test.name} request failed`,
      category: "http",
      status: "fail",
      summary: `${test.url} could not be fetched.`,
      details: { url: test.url, error: error instanceof Error ? error.name : String(error), responseTimeMs: Math.round(performance.now() - started) },
      remediation: "Check DNS, TLS, load balancer health, and public routing."
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runAnalyticsChecks(env: EnvironmentConfig, fetchImpl: FetchLike): Promise<CheckResult[]> {
  const pages = env.analytics?.pages ?? [];
  if (pages.length === 0) {
    return [{ id: "analytics:none", title: "No analytics marker checks configured", category: "analytics", status: "skip", summary: "No analytics marker checks configured." }];
  }

  return Promise.all(
    pages.map(async (page) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), page.timeoutMs);
      try {
        const response = await fetchImpl(page.url, { redirect: "follow", signal: controller.signal });
        const html = await response.text();
        const markerResults = page.markers.map((marker) => ({ name: marker.name, required: marker.required, present: html.includes(marker.substring) }));
        const missingRequired = markerResults.filter((marker) => marker.required && !marker.present);
        const missingOptional = markerResults.filter((marker) => !marker.required && !marker.present);
        const status = missingRequired.length > 0 ? "fail" : missingOptional.length > 0 ? "warn" : "pass";
        return {
          id: `analytics:${page.name}`,
          title: status === "pass" ? `${page.name} markers present` : `${page.name} markers need attention`,
          category: "analytics",
          status,
          summary: status === "pass" ? "Configured analytics markers were present." : `${missingRequired.length + missingOptional.length} analytics marker(s) were not found.`,
          details: { url: page.url, status: response.status, markers: markerResults },
          remediation: status === "pass" ? undefined : "Confirm analytics snippets and keys are present in the rendered HTML for this page."
        } satisfies CheckResult;
      } catch (error) {
        return {
          id: `analytics:${page.name}`,
          title: `${page.name} analytics check failed`,
          category: "analytics",
          status: "warn",
          summary: `${page.url} could not be fetched for analytics marker checks.`,
          details: { url: page.url, error: error instanceof Error ? error.name : String(error) },
          remediation: "Run smoke tests first, then inspect rendered page HTML."
        } satisfies CheckResult;
      } finally {
        clearTimeout(timeout);
      }
    })
  );
}

function buildSmokeSummary(test: SmokeTestConfig, actualStatus: number, finalUrl: string, finalUrlMatches: boolean): string {
  const statusPart = `${test.url} returned ${actualStatus}; expected ${test.expectedStatus}.`;
  if (!test.expectedFinalUrl) return statusPart;
  return finalUrlMatches ? `${statusPart} Final URL matched ${test.expectedFinalUrl}.` : `${statusPart} Final URL was ${finalUrl}; expected ${test.expectedFinalUrl}.`;
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  return parsed.toString();
}
