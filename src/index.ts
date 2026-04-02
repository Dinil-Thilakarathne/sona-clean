#!/usr/bin/env node

import { Command } from "commander";
import { cleanCommand } from "./commands/clean";
import { scanCommand } from "./commands/scan";
import { getDangerousCustomFolders, getSupportedTargetFolders } from "./core/scanner";

const program = new Command();
const builtInTargets = getSupportedTargetFolders().join(", ");
const dangerousCustomExamples = getDangerousCustomFolders().slice(0, 6).join(", ");
const targetHelp = `limit to built-in generated folders: ${builtInTargets}`;
const customHelp = "include custom folder names in addition to built-in targets; custom cleanup requires typed confirmation";

program
  .name("sona-clean")
  .description("Scan projects for generated folders and reclaim disk space safely")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan a directory recursively and show reclaimable space grouped by project")
  .argument("<path>", "path to scan")
  .option("-t, --target <folders...>", targetHelp)
  .option("-c, --custom <folders...>", customHelp)
  .action(scanCommand);

program
  .command("clean")
  .description("Scan first, then delete matched folders with safety checks and confirmation")
  .argument("<path>", "path to clean")
  .option("--all", "skip the standard yes/no confirmation for built-in safe cleanup")
  .option("--allow-broad-root", "allow cleaning broad roots like /, /Users, /tmp, or your home directory")
  .option(
    "--allow-dangerous-custom",
    `allow dangerous custom names such as ${dangerousCustomExamples}`
  )
  .option("-t, --target <folders...>", targetHelp)
  .option("-c, --custom <folders...>", customHelp)
  .action(cleanCommand);

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
