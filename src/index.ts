#!/usr/bin/env node

import { Command } from "commander";
import { cleanCommand } from "./commands/clean";
import { scanCommand } from "./commands/scan";

const program = new Command();

program
  .name("sona-clean")
  .description("Scan projects for generated folders and reclaim disk space safely")
  .version("0.0.1");

program.command("scan").argument("<path>", "path to scan").action(scanCommand);

program
  .command("clean")
  .argument("<path>", "path to clean")
  .option("--all", "remove all detected folders without prompting")
  .action(cleanCommand);

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
