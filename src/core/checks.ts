import type { AwsClients } from "../aws/clients.js";
import { runAcmChecks } from "../aws/acmChecks.js";
import { runDynamoDbChecks } from "../aws/dynamodbChecks.js";
import { runEcsChecks } from "../aws/ecsChecks.js";
import { runRoute53Checks } from "../aws/route53Checks.js";
import { runSecretsChecks } from "../aws/secretsChecks.js";
import { runSesChecks } from "../aws/sesChecks.js";
import { runSsmChecks } from "../aws/ssmChecks.js";
import type { EnvironmentConfig } from "../config/schema.js";
import { runSmokeChecks, type FetchLike } from "../http/smokeChecks.js";
import type { CheckResult } from "./types.js";

export async function runVerifyChecks(env: EnvironmentConfig, clients: AwsClients): Promise<CheckResult[]> {
  const groups = await Promise.all([
    runEcsChecks(clients.ecs, env),
    runDynamoDbChecks(clients.dynamodb, env),
    runSsmChecks(clients.ssm, env),
    runSecretsChecks(clients.secrets, env),
    runRoute53Checks(clients.route53, env),
    runAcmChecks(clients.acm, env),
    runSesChecks(clients.ses, env)
  ]);
  return groups.flat();
}

export async function runPublicChecks(env: EnvironmentConfig, fetchImpl?: FetchLike): Promise<CheckResult[]> {
  return runSmokeChecks(env, fetchImpl);
}

export async function runAllChecks(env: EnvironmentConfig, clients: AwsClients, fetchImpl?: FetchLike): Promise<CheckResult[]> {
  const [verify, smoke] = await Promise.all([runVerifyChecks(env, clients), runPublicChecks(env, fetchImpl)]);
  return [...verify, ...smoke];
}
