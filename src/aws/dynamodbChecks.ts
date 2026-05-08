import { DescribeTableCommand, type DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { EnvironmentConfig } from "../config/schema.js";
import type { CheckResult } from "../core/types.js";
import { getErrorName } from "./clients.js";

export async function runDynamoDbChecks(dynamodb: DynamoDBClient, env: EnvironmentConfig): Promise<CheckResult[]> {
  if (env.dynamodbTables.length === 0) {
    return [{ id: "dynamodb:none", title: "No DynamoDB tables configured", category: "dynamodb", status: "skip", summary: "No DynamoDB tables configured." }];
  }

  return Promise.all(
    env.dynamodbTables.map(async (tableName) => {
      try {
        const response = await dynamodb.send(new DescribeTableCommand({ TableName: tableName }));
        const status = response.Table?.TableStatus;
        return {
          id: `dynamodb:${tableName}`,
          title: status === "ACTIVE" ? `Table ${tableName} active` : `Table ${tableName} not active`,
          category: "dynamodb",
          status: status === "ACTIVE" ? "pass" : "warn",
          summary: status === "ACTIVE" ? `${tableName} is ACTIVE.` : `${tableName} status is ${status ?? "unknown"}.`,
          details: { tableName, tableStatus: status, itemCount: response.Table?.ItemCount },
          remediation: status === "ACTIVE" ? undefined : "Wait for the table to become ACTIVE or inspect recent table operations."
        } satisfies CheckResult;
      } catch (error) {
        return {
          id: `dynamodb:${tableName}`,
          title: `Table ${tableName} missing`,
          category: "dynamodb",
          status: "fail",
          summary: `${tableName} could not be described.`,
          details: { tableName, error: getErrorName(error) },
          remediation: "Create the table or update cockpit.config.json with the actual table name."
        } satisfies CheckResult;
      }
    })
  );
}
