import { z } from "zod";

const route53RecordSchema = z.union([
  z.string(),
  z.object({
    name: z.string().min(1),
    required: z.boolean().default(false)
  })
]);

const smokeTestSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  expectedFinalUrl: z.string().url().optional(),
  timeoutMs: z.number().int().positive().default(10_000)
});

const analyticsMarkerSchema = z.object({
  name: z.string().min(1),
  substring: z.string().min(1),
  required: z.boolean().default(false)
});

const environmentSchema = z.object({
  name: z.string().min(1),
  urls: z.record(z.string().url()).default({}),
  ecs: z
    .object({
      clusterName: z.string().min(1),
      services: z.array(z.string().min(1)).default([])
    })
    .optional(),
  route53: z
    .object({
      hostedZoneDomain: z.string().min(1),
      records: z.array(route53RecordSchema).default([])
    })
    .optional(),
  acm: z
    .object({
      requiredHostnames: z.array(z.string().min(1)).default([])
    })
    .optional(),
  ssmRequiredParameters: z.array(z.string().min(1)).default([]),
  secretsManagerRequiredSecrets: z.array(z.string().min(1)).default([]),
  ses: z
    .object({
      fromEmail: z.string().email().optional(),
      domain: z.string().min(1).optional()
    })
    .optional(),
  dynamodbTables: z.array(z.string().min(1)).default([]),
  smokeTests: z.array(smokeTestSchema).default([]),
  analytics: z
    .object({
      pages: z
        .array(
          z.object({
            name: z.string().min(1),
            url: z.string().url(),
            markers: z.array(analyticsMarkerSchema).default([]),
            timeoutMs: z.number().int().positive().default(10_000)
          })
        )
        .default([])
    })
    .optional()
});

export const cockpitConfigSchema = z.object({
  aws: z.object({
    region: z.string().min(1).default("us-east-1"),
    profile: z.string().min(1).optional()
  }),
  environments: z.record(environmentSchema).refine((envs) => Object.keys(envs).length > 0, "At least one environment is required")
});

export type CockpitConfig = z.infer<typeof cockpitConfigSchema>;
export type EnvironmentConfig = z.infer<typeof environmentSchema>;
export type SmokeTestConfig = z.infer<typeof smokeTestSchema>;
export type Route53RecordConfig = z.infer<typeof route53RecordSchema>;
