import { cockpitConfigSchema } from "../src/config/schema.js";

describe("config validation", () => {
  it("accepts the minimum useful config", () => {
    const parsed = cockpitConfigSchema.parse({
      aws: { region: "us-east-1" },
      environments: {
        prod: {
          name: "prod"
        }
      }
    });

    expect(parsed.environments.prod.ssmRequiredParameters).toEqual([]);
    expect(parsed.environments.prod.smokeTests).toEqual([]);
  });

  it("returns useful path errors for invalid URLs", () => {
    const result = cockpitConfigSchema.safeParse({
      aws: { region: "us-east-1" },
      environments: {
        prod: {
          name: "prod",
          smokeTests: [{ name: "Home", url: "not-a-url" }]
        }
      }
    });

    expect(result.success).toBe(false);
    expect(result.success ? "" : result.error.issues[0]?.path.join(".")).toContain("smokeTests");
  });
});
