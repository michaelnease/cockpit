import { mapEcsServiceResult } from "../src/aws/ecsChecks.js";

describe("ECS result mapping", () => {
  it("fails when desired count does not match running count", () => {
    const result = mapEcsServiceResult("northwind-prod", "northwind-ui-prod", {
      desiredCount: 2,
      runningCount: 1,
      pendingCount: 0,
      taskDefinition: "task:1",
      deployments: [{ status: "PRIMARY", rolloutState: "COMPLETED" }]
    });

    expect(result.status).toBe("fail");
    expect(result.details?.taskDefinition).toBe("task:1");
  });

  it("passes scaled-to-zero services", () => {
    const result = mapEcsServiceResult("northwind-prod", "worker-prod", {
      desiredCount: 0,
      runningCount: 0,
      pendingCount: 0
    });

    expect(result.status).toBe("pass");
  });
});
