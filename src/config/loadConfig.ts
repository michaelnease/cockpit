import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ZodError } from "zod";
import { cockpitConfigSchema, type CockpitConfig } from "./schema.js";

export async function loadConfig(configPath = "cockpit.config.json"): Promise<CockpitConfig> {
  const absolutePath = resolve(process.cwd(), configPath);
  let raw: string;

  try {
    raw = await readFile(absolutePath, "utf8");
  } catch (error) {
    throw new Error(`Could not read config at ${absolutePath}: ${formatUnknownError(error)}`);
  }

  try {
    return cockpitConfigSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Config is not valid JSON: ${error.message}`);
    }
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`);
      throw new Error(`Config validation failed:\n${messages.join("\n")}`);
    }
    throw error;
  }
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
