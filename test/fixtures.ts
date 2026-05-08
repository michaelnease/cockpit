import type { CockpitConfig, EnvironmentConfig } from "../src/config/schema.js";

export const fixtureEnvironment: EnvironmentConfig = {
  name: "prod",
  urls: { site: "https://northwind.ai" },
  ecs: { clusterName: "northwind-prod", services: ["northwind-ui-prod"] },
  route53: { hostedZoneDomain: "northwind.ai", records: [] },
  acm: { requiredHostnames: ["northwind.ai"] },
  ssmRequiredParameters: ["/northwind/prod/example"],
  secretsManagerRequiredSecrets: ["northwind/prod/secret"],
  ses: { fromEmail: "hello@northwind.ai", domain: "northwind.ai" },
  dynamodbTables: ["northwind-prod"],
  smokeTests: [{ name: "Home", url: "https://northwind.ai", expectedStatus: 200, timeoutMs: 10_000 }]
};

export const fixtureConfig: CockpitConfig = {
  aws: { region: "us-east-1", profile: "default" },
  environments: { prod: fixtureEnvironment }
};
