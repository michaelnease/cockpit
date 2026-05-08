import { GetAccountCommand, GetEmailIdentityCommand, type SESv2Client } from "@aws-sdk/client-sesv2";
import type { EnvironmentConfig } from "../config/schema.js";
import type { CheckResult } from "../core/types.js";
import { getErrorName } from "./clients.js";

export async function runSesChecks(ses: SESv2Client, env: EnvironmentConfig): Promise<CheckResult[]> {
  if (!env.ses?.fromEmail && !env.ses?.domain) {
    return [{ id: "ses:none", title: "No SES identities configured", category: "ses", status: "skip", summary: "No SES identities configured." }];
  }

  const results: CheckResult[] = [];
  try {
    const account = await ses.send(new GetAccountCommand({}));
    const productionAccess = account.ProductionAccessEnabled === true;
    results.push({
      id: "ses:account",
      title: productionAccess ? "SES production access enabled" : "SES production access unconfirmed",
      category: "ses",
      status: productionAccess ? "pass" : "warn",
      summary: productionAccess ? "SES production access is enabled." : "SES appears sandboxed or production access could not be confirmed.",
      details: { productionAccessEnabled: account.ProductionAccessEnabled, sendingEnabled: account.SendingEnabled },
      remediation: productionAccess ? undefined : "Request SES production access or confirm this account is allowed to send to real recipients."
    });
  } catch (error) {
    results.push({
      id: "ses:account",
      title: "SES production access could not be confirmed",
      category: "ses",
      status: "warn",
      summary: "SES account sending status could not be checked.",
      details: { error: getErrorName(error) },
      remediation: "Check ses:GetAccount permissions or verify SES manually."
    });
  }

  for (const identity of [env.ses.fromEmail, env.ses.domain].filter(Boolean) as string[]) {
    results.push(await checkIdentity(ses, identity));
  }

  return results;
}

async function checkIdentity(ses: SESv2Client, identity: string): Promise<CheckResult> {
  try {
    const response = await ses.send(new GetEmailIdentityCommand({ EmailIdentity: identity }));
    const verified = response.VerificationStatus === "SUCCESS";
    return {
      id: `ses:identity:${identity}`,
      title: verified ? `SES identity ${identity} verified` : `SES identity ${identity} unverified`,
      category: "ses",
      status: verified ? "pass" : "fail",
      summary: verified ? `${identity} is verified for SES sending.` : `${identity} is not verified for SES sending.`,
      details: { identity, verificationStatus: response.VerificationStatus },
      remediation: verified ? undefined : "Complete SES identity verification or update the configured sender identity."
    };
  } catch (error) {
    return {
      id: `ses:identity:${identity}`,
      title: `SES identity ${identity} missing`,
      category: "ses",
      status: "fail",
      summary: `${identity} could not be found or described in SES.`,
      details: { identity, error: getErrorName(error) },
      remediation: "Create and verify this SES identity or update cockpit.config.json."
    };
  }
}
