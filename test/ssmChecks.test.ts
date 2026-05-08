import { runSsmChecks } from "../src/aws/ssmChecks.js";
import { fixtureEnvironment } from "./fixtures.js";

describe("SSM checks", () => {
  it("returns a clean failure for missing parameters", async () => {
    const ssm = {
      send: vi.fn(async () => {
        const error = new Error("Parameter not found");
        error.name = "ParameterNotFound";
        throw error;
      })
    };

    const results = await runSsmChecks(ssm as never, fixtureEnvironment);

    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("fail");
    expect(results[0]?.details).toEqual({ name: "/northwind/prod/example", error: "ParameterNotFound" });
  });
});
