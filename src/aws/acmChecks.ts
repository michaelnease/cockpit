import { DescribeCertificateCommand, ListCertificatesCommand, type ACMClient, type CertificateSummary } from "@aws-sdk/client-acm";
import type { EnvironmentConfig } from "../config/schema.js";
import type { CheckResult } from "../core/types.js";
import { getErrorName } from "./clients.js";

export async function runAcmChecks(acm: ACMClient, env: EnvironmentConfig): Promise<CheckResult[]> {
  const hostnames = env.acm?.requiredHostnames ?? Object.values(env.urls).map((url) => new URL(url).hostname);
  if (hostnames.length === 0) {
    return [{ id: "acm:none", title: "No ACM hostnames configured", category: "acm", status: "skip", summary: "No ACM hostnames configured." }];
  }

  try {
    const summaries: CertificateSummary[] = [];
    let nextToken: string | undefined;
    do {
      const response = await acm.send(new ListCertificatesCommand({ NextToken: nextToken, CertificateStatuses: ["ISSUED", "PENDING_VALIDATION", "EXPIRED", "INACTIVE", "VALIDATION_TIMED_OUT"] }));
      summaries.push(...(response.CertificateSummaryList ?? []));
      nextToken = response.NextToken;
    } while (nextToken);

    return Promise.all(hostnames.map((hostname) => checkHostname(acm, hostname, summaries)));
  } catch (error) {
    return hostnames.map((hostname) => ({
      id: `acm:${hostname}`,
      title: `Certificate lookup failed for ${hostname}`,
      category: "acm",
      status: "fail",
      summary: `Could not list ACM certificates for ${hostname}.`,
      details: { hostname, error: getErrorName(error) },
      remediation: "Check AWS region and acm:ListCertificates permissions."
    }));
  }
}

async function checkHostname(acm: ACMClient, hostname: string, summaries: CertificateSummary[]): Promise<CheckResult> {
  const candidate = summaries.find((summary) => coversHostname(summary.DomainName, hostname) || summary.SubjectAlternativeNameSummaries?.some((name) => coversHostname(name, hostname)));
  if (!candidate?.CertificateArn) {
    return {
      id: `acm:${hostname}`,
      title: `No issued certificate covers ${hostname}`,
      category: "acm",
      status: "fail",
      summary: `No ACM certificate summary covers ${hostname}.`,
      details: { hostname },
      remediation: "Request or import an issued ACM certificate that covers this hostname."
    };
  }

  const cert = await acm.send(new DescribeCertificateCommand({ CertificateArn: candidate.CertificateArn }));
  const certificate = cert.Certificate;
  const notAfter = certificate?.NotAfter;
  const expiresWithin30Days = notAfter ? notAfter.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 : false;

  return {
    id: `acm:${hostname}`,
    title: expiresWithin30Days ? `Certificate for ${hostname} expires soon` : `Certificate covers ${hostname}`,
    category: "acm",
    status: expiresWithin30Days ? "warn" : "pass",
    summary: expiresWithin30Days ? `ACM certificate for ${hostname} expires within 30 days.` : `An ISSUED ACM certificate covers ${hostname}.`,
    details: { hostname, certificateArn: candidate.CertificateArn, domainName: certificate?.DomainName, notAfter: notAfter?.toISOString(), status: certificate?.Status },
    remediation: expiresWithin30Days ? "Renew or replace the certificate before expiration." : undefined
  };
}

function coversHostname(pattern: string | undefined, hostname: string): boolean {
  if (!pattern) return false;
  if (pattern === hostname) return true;
  if (!pattern.startsWith("*.")) return false;
  const suffix = pattern.slice(1);
  return hostname.endsWith(suffix) && hostname.split(".").length === pattern.split(".").length;
}
