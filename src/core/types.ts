export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export type CheckCategory =
  | "ecs"
  | "route53"
  | "acm"
  | "ssm"
  | "secrets"
  | "ses"
  | "dynamodb"
  | "http"
  | "analytics"
  | "config";

export type CheckResult = {
  id: string;
  title: string;
  category: CheckCategory;
  status: CheckStatus;
  summary: string;
  details?: Record<string, unknown>;
  remediation?: string;
};

export type ReadinessStatus = "ready" | "attention" | "blocked";

export type ReadinessReport = {
  environment: string;
  generatedAt: string;
  status: ReadinessStatus;
  totals: Record<CheckStatus, number>;
  results: CheckResult[];
};
