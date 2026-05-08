import { runSecretsChecks } from "../src/aws/secretsChecks.js";
import { fixtureEnvironment } from "./fixtures.js";

describe("Secrets Manager checks", () => {
  it("does not expose secret values in results", async () => {
    const secrets = {
      send: vi.fn(async () => ({
        Name: "northwind/prod/secret",
        ARN: "arn:aws:secretsmanager:us-east-1:123:secret:northwind/prod/secret",
        SecretString: "do-not-print"
      }))
    };

    const results = await runSecretsChecks(secrets as never, fixtureEnvironment);
    const serialized = JSON.stringify(results);

    expect(results[0]?.status).toBe("pass");
    expect(serialized).not.toContain("do-not-print");
  });
});
