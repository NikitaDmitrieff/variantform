#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { VALID_FORMATS, MERGEABLE_FORMATS } from "./config.js";
import { runInit } from "./commands/init.js";
import { runCreate } from "./commands/create.js";
import { runResolve } from "./commands/resolve.js";
import { runStatus } from "./commands/status.js";
import { runDiff } from "./commands/diff.js";
import { runValidate } from "./commands/validate.js";

const program = new Command();

program
  .name("variantform")
  .description("Git-native overlay tool for managing per-client SaaS product variants")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize variantform in the current project")
  .requiredOption(
    "-s, --surface <surface...>",
    "Surface declarations in format path:format[:strategy] (e.g. config/features.json:json:merge)"
  )
  .action(async (opts) => {
    const surfaces = opts.surface.map((s: string) => {
      const parts = s.split(":");
      const [path, format, strategy] = parts;
      if (!path || !format || !VALID_FORMATS.includes(format as any)) {
        console.error(chalk.red(`Invalid surface: "${s}". Use path:format[:strategy]. Format must be one of: ${VALID_FORMATS.join(", ")}`));
        process.exit(1);
      }
      if (strategy && !["merge", "replace"].includes(strategy)) {
        console.error(chalk.red(`Invalid strategy "${strategy}". Must be "merge" or "replace".`));
        process.exit(1);
      }
      const defaultStrategy = MERGEABLE_FORMATS.includes(format as any) ? "merge" : "replace";
      return {
        path,
        format: format as any,
        strategy: (strategy as "merge" | "replace") || defaultStrategy,
      };
    });

    try {
      await runInit(process.cwd(), surfaces);
      console.log(chalk.green("Variantform initialized."));
      console.log(`  ${surfaces.length} surface(s) configured.`);
      console.log(`  Created ${chalk.bold("variants/")} directory.`);
      console.log(`\n  Next: ${chalk.cyan("variantform create <client-name>")}`);
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("create <client-name>")
  .description("Create a new client variant")
  .action(async (clientName: string) => {
    try {
      await runCreate(process.cwd(), clientName);
      console.log(chalk.green(`Variant "${clientName}" created.`));
      console.log(`  Directory: ${chalk.bold(`variants/${clientName}/`)}`);
      console.log(`\n  Add overrides by creating files in that directory.`);
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("resolve <client-name> [surface]")
  .description("Output the resolved config for a client (base + overrides)")
  .action(async (clientName: string, surface?: string) => {
    try {
      const results = await runResolve(process.cwd(), clientName, surface);
      for (const r of results) {
        if (results.length > 1) {
          console.log(chalk.dim(`--- ${r.surface} ${r.hasOverride ? "(overridden)" : "(base)"} ---`));
        }
        console.log(r.content);
      }
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show all variants and their override state")
  .action(async () => {
    try {
      const statuses = await runStatus(process.cwd());
      if (statuses.length === 0) {
        console.log("No variants found. Create one with: variantform create <client-name>");
        return;
      }
      console.log(`\n${chalk.bold("Variants")} (${statuses.length})\n`);
      for (const s of statuses) {
        const overrides = s.overrideCount > 0 ? `${s.overrideCount} override(s)` : chalk.dim("no overrides");
        const violations = s.violations.length > 0
          ? chalk.red(` [${s.violations.length} violation(s)]`)
          : "";
        console.log(`  ${chalk.bold(s.name.padEnd(20))} ${overrides}${violations}`);
      }
      console.log();
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("diff <client-name>")
  .description("Show what a variant overrides compared to base")
  .action(async (clientName: string) => {
    try {
      const results = await runDiff(process.cwd(), clientName);
      if (results.length === 0) {
        console.log(`Variant "${clientName}" has no overrides.`);
        return;
      }
      console.log(`\n${chalk.bold(clientName)} overrides:\n`);
      for (const r of results) {
        console.log(`  ${chalk.cyan(r.surface)}`);
        for (const key of r.overrideKeys) {
          console.log(`    ${chalk.yellow(key)}`);
        }
      }
      console.log();
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Check all overrides are valid against current base")
  .action(async () => {
    try {
      const issues = await runValidate(process.cwd());
      if (issues.length === 0) {
        console.log(chalk.green("All variants are valid."));
        return;
      }
      console.log(chalk.red(`\n${issues.length} issue(s) found:\n`));
      for (const issue of issues) {
        const prefix = issue.type === "stale_key"
          ? chalk.yellow("STALE")
          : issue.type === "parse_error"
          ? chalk.red("ERROR")
          : issue.type === "empty_file"
          ? chalk.yellow("EMPTY")
          : chalk.red("EXTRA");
        console.log(`  ${prefix} [${issue.variant}] ${issue.message}`);
      }
      console.log();
      process.exit(1);
    } catch (e) {
      console.error(chalk.red(`Error: ${(e as Error).message}`));
      process.exit(1);
    }
  });

program.parse();
