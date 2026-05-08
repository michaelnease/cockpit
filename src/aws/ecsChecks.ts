import { DescribeClustersCommand, DescribeServicesCommand, type ECSClient } from "@aws-sdk/client-ecs";
import type { EnvironmentConfig } from "../config/schema.js";
import type { CheckResult } from "../core/types.js";
import { getErrorName } from "./clients.js";

export async function runEcsChecks(ecs: ECSClient, env: EnvironmentConfig): Promise<CheckResult[]> {
  if (!env.ecs) {
    return [{ id: "ecs:none", title: "No ECS checks configured", category: "ecs", status: "skip", summary: "No ECS cluster configured." }];
  }

  const results: CheckResult[] = [];
  const clusterName = env.ecs.clusterName;

  try {
    const clusterResponse = await ecs.send(new DescribeClustersCommand({ clusters: [clusterName] }));
    const cluster = clusterResponse.clusters?.find((item) => item.clusterName === clusterName);
    if (!cluster || cluster.status !== "ACTIVE") {
      return [
        {
          id: `ecs:cluster:${clusterName}`,
          title: `Cluster ${clusterName} missing`,
          category: "ecs",
          status: "fail",
          summary: `${clusterName} was not found as an ACTIVE ECS cluster.`,
          details: { clusterName, failures: clusterResponse.failures },
          remediation: "Create the ECS cluster or update cockpit.config.json with the actual cluster name."
        }
      ];
    }

    results.push({
      id: `ecs:cluster:${clusterName}`,
      title: `Cluster ${clusterName} exists`,
      category: "ecs",
      status: "pass",
      summary: `${clusterName} is ACTIVE.`,
      details: { clusterName, status: cluster.status, runningTasksCount: cluster.runningTasksCount, pendingTasksCount: cluster.pendingTasksCount }
    });
  } catch (error) {
    return [
      {
        id: `ecs:cluster:${clusterName}`,
        title: `Cluster ${clusterName} unavailable`,
        category: "ecs",
        status: "fail",
        summary: `${clusterName} could not be described.`,
        details: { clusterName, error: getErrorName(error) },
        remediation: "Check AWS credentials, region, and ecs:DescribeClusters permissions."
      }
    ];
  }

  if (env.ecs.services.length === 0) {
    results.push({ id: "ecs:services:none", title: "No ECS services configured", category: "ecs", status: "skip", summary: "No ECS services configured." });
    return results;
  }

  try {
    const serviceResponse = await ecs.send(new DescribeServicesCommand({ cluster: clusterName, services: env.ecs.services }));
    const found = new Map((serviceResponse.services ?? []).map((service) => [service.serviceName, service]));

    for (const serviceName of env.ecs.services) {
      const service = found.get(serviceName);
      if (!service) {
        results.push({
          id: `ecs:service:${serviceName}`,
          title: `Service ${serviceName} missing`,
          category: "ecs",
          status: "fail",
          summary: `${serviceName} was not found in ${clusterName}.`,
          details: { clusterName, serviceName, failures: serviceResponse.failures },
          remediation: "Create the ECS service or update cockpit.config.json with the actual service name."
        });
        continue;
      }

      results.push(mapEcsServiceResult(clusterName, serviceName, service));
    }
  } catch (error) {
    for (const serviceName of env.ecs.services) {
      results.push({
        id: `ecs:service:${serviceName}`,
        title: `Service ${serviceName} unavailable`,
        category: "ecs",
        status: "fail",
        summary: `${serviceName} could not be described.`,
        details: { clusterName, serviceName, error: getErrorName(error) },
        remediation: "Check AWS credentials, region, and ecs:DescribeServices permissions."
      });
    }
  }

  return results;
}

export function mapEcsServiceResult(clusterName: string, serviceName: string, service: {
  taskDefinition?: string;
  desiredCount?: number;
  runningCount?: number;
  pendingCount?: number;
  deployments?: Array<{ rolloutState?: string; status?: string }>;
}): CheckResult {
  const desiredCount = service.desiredCount ?? 0;
  const runningCount = service.runningCount ?? 0;
  const pendingCount = service.pendingCount ?? 0;
  const latestDeployment = service.deployments?.find((deployment) => deployment.status === "PRIMARY") ?? service.deployments?.[0];
  const rolloutState = latestDeployment?.rolloutState;

  const details = {
    clusterName,
    serviceName,
    taskDefinition: service.taskDefinition,
    desiredCount,
    runningCount,
    pendingCount,
    rolloutState
  };

  if (desiredCount > 0 && desiredCount !== runningCount) {
    return {
      id: `ecs:service:${serviceName}`,
      title: `Service ${serviceName} not stable`,
      category: "ecs",
      status: "fail",
      summary: `${serviceName} desired count is ${desiredCount}, running count is ${runningCount}.`,
      details,
      remediation: "Check ECS events, target group health, and latest deployment logs."
    };
  }

  if (rolloutState && rolloutState !== "COMPLETED") {
    return {
      id: `ecs:service:${serviceName}`,
      title: `Service ${serviceName} deployment ${rolloutState}`,
      category: "ecs",
      status: "warn",
      summary: `${serviceName} latest deployment rollout state is ${rolloutState}.`,
      details,
      remediation: "Wait for rollout completion or inspect the failed deployment."
    };
  }

  if (pendingCount > 0) {
    return {
      id: `ecs:service:${serviceName}`,
      title: `Service ${serviceName} has pending tasks`,
      category: "ecs",
      status: "warn",
      summary: `${serviceName} has ${pendingCount} pending task(s).`,
      details,
      remediation: "Inspect ECS capacity, image pulls, and task startup health."
    };
  }

  return {
    id: `ecs:service:${serviceName}`,
    title: `Service ${serviceName} stable`,
    category: "ecs",
    status: "pass",
    summary: desiredCount === 0 ? `${serviceName} is intentionally scaled to zero.` : `${serviceName} is stable.`,
    details
  };
}
