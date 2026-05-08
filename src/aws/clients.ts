import { ACMClient } from "@aws-sdk/client-acm";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ECSClient } from "@aws-sdk/client-ecs";
import { Route53Client } from "@aws-sdk/client-route-53";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { SESv2Client } from "@aws-sdk/client-sesv2";
import { SSMClient } from "@aws-sdk/client-ssm";
import { fromIni } from "@aws-sdk/credential-providers";
import type { CockpitConfig } from "../config/schema.js";

export type AwsClients = {
  ecs: ECSClient;
  route53: Route53Client;
  acm: ACMClient;
  ssm: SSMClient;
  secrets: SecretsManagerClient;
  ses: SESv2Client;
  dynamodb: DynamoDBClient;
};

export function createAwsClients(config: CockpitConfig): AwsClients {
  const awsConfig = {
    region: config.aws.region,
    credentials: config.aws.profile ? fromIni({ profile: config.aws.profile }) : undefined
  };

  return {
    ecs: new ECSClient(awsConfig),
    route53: new Route53Client(awsConfig),
    acm: new ACMClient(awsConfig),
    ssm: new SSMClient(awsConfig),
    secrets: new SecretsManagerClient(awsConfig),
    ses: new SESv2Client(awsConfig),
    dynamodb: new DynamoDBClient(awsConfig)
  };
}

export function getErrorName(error: unknown): string {
  if (error instanceof Error && "name" in error) return error.name;
  return "UnknownError";
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
