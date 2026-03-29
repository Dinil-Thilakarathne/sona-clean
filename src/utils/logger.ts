import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import path from "node:path";
import { formatBytes } from "../core/size";
import type { DeletionResult } from "../core/cleaner";
import type { ScanResult, SizedFolder } from "../core/scanner";

interface FolderGroup {
  label: string;
  projectKey: string;
  count: number;
  sizeBytes: number;
}

function getFolderGroupLabel(root: string, folder: SizedFolder): string {
  const relativePath = path.relative(root, folder.path);
  const segments = relativePath.split(path.sep).filter(Boolean);

  if (segments.length <= 1) {
    return folder.name;
  }

  return `${segments[0]}/${folder.name}`;
}

function getProjectKey(root: string, folder: SizedFolder): string {
  const relativePath = path.relative(root, folder.path);
  const segments = relativePath.split(path.sep).filter(Boolean);

  return segments[0] ?? folder.name;
}

function groupFolders(root: string, folders: SizedFolder[]): FolderGroup[] {
  const grouped = new Map<string, FolderGroup>();

  for (const folder of folders) {
    const label = getFolderGroupLabel(root, folder);
    const existing = grouped.get(label);

    if (existing) {
      existing.count += 1;
      existing.sizeBytes += folder.sizeBytes;
      continue;
    }

    grouped.set(label, {
      label,
      projectKey: getProjectKey(root, folder),
      count: 1,
      sizeBytes: folder.sizeBytes
    });
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.projectKey !== right.projectKey) {
      return left.projectKey.localeCompare(right.projectKey);
    }

    if (left.sizeBytes !== right.sizeBytes) {
      return right.sizeBytes - left.sizeBytes;
    }

    return left.label.localeCompare(right.label);
  });
}

function formatGroupLabel(group: FolderGroup): string {
  const suffix = group.count === 1 ? "folder" : "folders";
  return `${group.label} (${group.count} ${suffix})`;
}

export const logger = {
  info(message: string): void {
    console.log(message);
  },

  printMeasureStart(folderCount: number): void {
    if (folderCount === 0) {
      return;
    }

    console.log(`Found ${folderCount} generated folders. Measuring sizes...`);
    console.log("");
  },

  printMeasureProgress(completedFolders: number, totalFolders: number): void {
    if (totalFolders === 0) {
      return;
    }

    if (completedFolders === totalFolders || completedFolders % 25 === 0) {
      console.log(`Measured ${completedFolders}/${totalFolders} folders...`);
    }
  },

  printScanSummary(result: ScanResult): void {
    if (result.folders.length > 0) {
      console.log("");
    }

    console.log(`Scanning root: ${result.root}`);
    console.log("");

    if (result.folders.length === 0) {
      console.log("No generated folders found.");
      return;
    }

    const groups = groupFolders(result.root, result.folders);
    let previousProjectKey: string | null = null;

    for (const group of groups) {
      if (previousProjectKey !== null && previousProjectKey !== group.projectKey) {
        console.log("");
      }

      console.log(`${formatBytes(group.sizeBytes).padStart(10)}  ${formatGroupLabel(group)}`);
      previousProjectKey = group.projectKey;
    }

    console.log("");
    console.log(`Matched folders: ${result.folders.length}`);
    console.log(`Total reclaimable: ${formatBytes(result.totalSizeBytes)}`);
  },

  printDeletionSummary(root: string, results: DeletionResult[]): void {
    console.log("");

    const deletedGroups = groupFolders(
      root,
      results.filter((result) => result.success).map((result) => result.folder)
    );

    for (const group of deletedGroups) {
      console.log(`Deleted: ${formatGroupLabel(group)}`);
    }

    const failedResults = results.filter((result) => !result.success);

    for (const result of failedResults) {
      console.log(`Failed: ${result.folder.name}`);
      console.log(`Reason: ${result.error}`);
    }

    const deletedCount = results.length - failedResults.length;
    const failedCount = failedResults.length;

    console.log("");
    console.log(`Deleted folders: ${deletedCount}`);
    console.log(`Failed deletions: ${failedCount}`);
  }
};

export async function promptForConfirmation(message: string): Promise<boolean> {
  const rl = createInterface({ input, output });

  try {
    const answer = await rl.question(message);
    return ["y", "yes"].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}
