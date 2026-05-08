# Local Deployment Cockpit

Local Deployment Cockpit is a read-only TypeScript CLI for checking northwind.ai deployment readiness across AWS infrastructure and public HTTP smoke tests.

## Install

```bash
pnpm install
```

## Configure

Edit `cockpit.config.json` with your real AWS resource names, profile, region, URLs, smoke tests, and required parameters.

The default AWS region is `us-east-1`. The CLI uses your local AWS credentials through the AWS SDK v3. Set the profile in config or override it per run:

```bash
AWS_PROFILE=northwind-prod pnpm cockpit report prod
```

## Run

```bash
pnpm cockpit verify prod
pnpm cockpit smoke prod
pnpm cockpit report prod
pnpm cockpit report dev
```

Emit machine-readable JSON:

```bash
pnpm cockpit report prod --json
```

## Security

Secret values are never printed. SSM parameters are checked with `WithDecryption=false`, and Secrets Manager checks use `DescribeSecret` instead of reading secret values.

## Add Checks

Add a small module that returns `CheckResult[]`, then include it from `src/core/checks.ts`. Keep external systems behind interfaces so the CLI can later be wrapped by a Tauri UI without changing core behavior.
