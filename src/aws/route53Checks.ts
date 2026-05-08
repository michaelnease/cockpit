import { ListHostedZonesByNameCommand, ListResourceRecordSetsCommand, type ResourceRecordSet, type Route53Client } from "@aws-sdk/client-route-53";
import type { EnvironmentConfig, Route53RecordConfig } from "../config/schema.js";
import type { CheckResult } from "../core/types.js";
import { getErrorName } from "./clients.js";

export async function runRoute53Checks(route53: Route53Client, env: EnvironmentConfig): Promise<CheckResult[]> {
  if (!env.route53) {
    return [{ id: "route53:none", title: "No Route 53 checks configured", category: "route53", status: "skip", summary: "No hosted zone configured." }];
  }

  const domain = ensureTrailingDot(env.route53.hostedZoneDomain);
  try {
    const zones = await route53.send(new ListHostedZonesByNameCommand({ DNSName: domain }));
    const zone = zones.HostedZones?.find((item) => item.Name === domain);
    if (!zone?.Id) {
      return [
        {
          id: `route53:zone:${env.route53.hostedZoneDomain}`,
          title: `Hosted zone ${env.route53.hostedZoneDomain} missing`,
          category: "route53",
          status: "fail",
          summary: `No Route 53 hosted zone found for ${env.route53.hostedZoneDomain}.`,
          remediation: "Create the hosted zone or update cockpit.config.json with the correct domain."
        }
      ];
    }

    const results: CheckResult[] = [
      {
        id: `route53:zone:${env.route53.hostedZoneDomain}`,
        title: `Hosted zone ${env.route53.hostedZoneDomain} exists`,
        category: "route53",
        status: "pass",
        summary: `${env.route53.hostedZoneDomain} hosted zone exists.`,
        details: { id: zone.Id, name: zone.Name }
      }
    ];

    for (const configuredRecord of env.route53.records) {
      results.push(await checkRecord(route53, zone.Id, configuredRecord));
    }

    return results;
  } catch (error) {
    return [
      {
        id: `route53:zone:${env.route53.hostedZoneDomain}`,
        title: `Hosted zone ${env.route53.hostedZoneDomain} unavailable`,
        category: "route53",
        status: "fail",
        summary: `Route 53 hosted zone lookup failed.`,
        details: { domain: env.route53.hostedZoneDomain, error: getErrorName(error) },
        remediation: "Check route53:ListHostedZonesByName permissions."
      }
    ];
  }
}

async function checkRecord(route53: Route53Client, hostedZoneId: string, configuredRecord: Route53RecordConfig): Promise<CheckResult> {
  const recordName = typeof configuredRecord === "string" ? configuredRecord : configuredRecord.name;
  const required = typeof configuredRecord === "string" ? false : configuredRecord.required;
  const fqdn = ensureTrailingDot(recordName);
  const response = await route53.send(new ListResourceRecordSetsCommand({ HostedZoneId: hostedZoneId, StartRecordName: fqdn, MaxItems: 20 }));
  const matching = response.ResourceRecordSets?.filter((record) => record.Name === fqdn) ?? [];

  if (matching.length === 0) {
    return {
      id: `route53:record:${recordName}`,
      title: `Record ${recordName} missing`,
      category: "route53",
      status: required ? "fail" : "warn",
      summary: `${recordName} does not exist in Route 53.`,
      details: { recordName, required },
      remediation: "Create the DNS record or remove it from config if it is not expected."
    };
  }

  return {
    id: `route53:record:${recordName}`,
    title: `Record ${recordName} exists`,
    category: "route53",
    status: "pass",
    summary: `${recordName} has ${matching.length} record set(s).`,
    details: { recordName, records: matching.map(toSafeRecordDetails) }
  };
}

function ensureTrailingDot(value: string): string {
  return value.endsWith(".") ? value : `${value}.`;
}

function toSafeRecordDetails(record: ResourceRecordSet): Record<string, unknown> {
  return {
    type: record.Type,
    aliasTarget: record.AliasTarget?.DNSName,
    values: record.ResourceRecords?.map((item) => item.Value),
    ttl: record.TTL
  };
}
