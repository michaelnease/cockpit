import { DescribeSecretCommand, type SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import type { EnvironmentConfig } from "../config/schema.js";
import type { CheckResult } from "../core/types.js";
import { getErrorName } from "./clients.js";

export async function runSecretsChecks(secrets: SecretsManagerClient, env: EnvironmentConfig): Promise<CheckResult[]> {
  if (env.secretsManagerRequiredSecrets.length === 0) {
    return [{ id: "secrets:none", title: "No required Secrets Manager secrets configured", category: "secrets", status: "skip", summary: "No Secrets Manager secrets configured." }];
  }

  return Promise.all(
    env.secretsManagerRequiredSecrets.map(async (secretId) => {
      try {
        const response = await secrets.send(new DescribeSecretCommand({ SecretId: secretId }));
        const scheduledForDeletion = Boolean(response.DeletedDate);
        return {
          id: `secrets:${secretId}`,
          title: scheduledForDeletion ? `${secretId} scheduled for deletion` : `${secretId} exists`,
          category: "secrets",
          status: scheduledForDeletion ? "warn" : "pass",
          summary: scheduledForDeletion ? `${secretId} exists but is scheduled for deletion.` : `${secretId} exists and metadata is readable.`,
          details: {
            name: response.Name ?? secretId,
            arn: response.ARN,
            scheduledForDeletion,
            deletedDate: response.DeletedDate?.toISOString()
          },
          remediation: scheduledForDeletion ? "Cancel the scheduled deletion or update config to point at the replacement secret." : undefined
        } satisfies CheckResult;
      } catch (error) {
        return {
          id: `secrets:${secretId}`,
          title: `${secretId} missing or unreadable`,
          category: "secrets",
          status: "fail",
          summary: `${secretId} metadata could not be read.`,
          details: { name: secretId, error: getErrorName(error) },
          remediation: "Create the secret or grant the local AWS identity secretsmanager:DescribeSecret access."
        } satisfies CheckResult;
      }
    })
  );
}
