#!/usr/bin/env node
import { Command } from "commander";
import { createAwsClients } from "./aws/clients.js";
import { loadConfig } from "./config/loadConfig.js";
import { runAllChecks, runPublicChecks, runVerifyChecks } from "./core/checks.js";
import { buildReport } from "./core/report.js";
import { renderTerminalReport } from "./render/terminalReport.js";

const program = new Command();

program
  .name("cockpit")
  .description("Local-first deployment verification cockpit for northwind.ai")
  .option("-c, --config <path>", "Path to cockpit config", "cockpit.config.json");

program
  .command("verify")
  .argument("<environment>", "Environment key, for example prod or dev")
  .option("--json", "Print full JSON readiness report")
  .action(async (environment: string, options: { json?: boolean }) => {
    await runCommand(environment, options.json === true, "verify");
  });

program
  .command("smoke")
  .argument("<environment>", "Environment key, for example prod or dev")
  .option("--json", "Print full JSON readiness report")
  .action(async (environment: string, options: { json?: boolean }) => {
    await runCommand(environment, options.json === true, "smoke");
  });

program
  .command("report")
  .argument("<environment>", "Environment key, for example prod or dev")
  .option("--json", "Print full JSON readiness report")
  .action(async (environment: string, options: { json?: boolean }) => {
    await runCommand(environment, options.json === true, "report");
  });

async function runCommand(environmentKey: string, json: boolean, mode: "verify" | "smoke" | "report"): Promise<void> {
  try {
    const globalOptions = program.opts<{ config: string }>();
    const config = await loadConfig(globalOptions.config);
    const environment = config.environments[environmentKey];
    if (!environment) {
      throw new Error(`Environment "${environmentKey}" was not found in config. Available: ${Object.keys(config.environments).join(", ")}`);
    }

    const clients = mode === "smoke" ? undefined : createAwsClients(config);
    const results =
      mode === "verify"
        ? await runVerifyChecks(environment, clients!)
        : mode === "smoke"
          ? await runPublicChecks(environment)
          : await runAllChecks(environment, clients!);
    const report = buildReport(environment.name, results);

    if (json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderTerminalReport(report)}\n`);
    }

    if (report.status === "blocked") {
      process.exitCode = 2;
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

await program.parseAsync(process.argv);
