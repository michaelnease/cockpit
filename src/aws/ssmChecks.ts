import { GetParameterCommand, type SSMClient } from "@aws-sdk/client-ssm";
import type { EnvironmentConfig } from "../config/schema.js";
import type { CheckResult } from "../core/types.js";
import { getErrorName } from "./clients.js";

export async function runSsmChecks(ssm: SSMClient, env: EnvironmentConfig): Promise<CheckResult[]> {
  if (env.ssmRequiredParameters.length === 0) {
    return [{ id: "ssm:none", title: "No required SSM parameters configured", category: "ssm", status: "skip", summary: "No SSM parameters configured." }];
  }

  return Promise.all(
    env.ssmRequiredParameters.map(async (name) => {
      try {
        const response = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: false }));
        return {
          id: `ssm:${name}`,
          title: `${name} exists`,
          category: "ssm",
          status: "pass",
          summary: `${name} is readable.`,
          details: { name, type: response.Parameter?.Type, version: response.Parameter?.Version }
        } satisfies CheckResult;
      } catch (error) {
        return {
          id: `ssm:${name}`,
          title: `${name} missing or unreadable`,
          category: "ssm",
          status: "fail",
          summary: `${name} could not be read.`,
          details: { name, error: getErrorName(error) },
          remediation: "Create the parameter or grant the local AWS identity ssm:GetParameter access."
        } satisfies CheckResult;
      }
    })
  );
}
