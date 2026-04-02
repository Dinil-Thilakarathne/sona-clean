import { lstat, rm } from "node:fs/promises";
import { basename } from "node:path";
import { CliValidationError } from "./scanner";
import type { SizedFolder } from "./scanner";

export interface DeletionResult {
  folder: SizedFolder;
  success: boolean;
  error?: string;
}

export async function deleteFolder(folder: SizedFolder): Promise<DeletionResult> {
  try {
    await validateDeletionTarget(folder);
    await rm(folder.path, { recursive: true, force: true });

    return {
      folder,
      success: true
    };
  } catch (error) {
    return {
      folder,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

async function validateDeletionTarget(folder: SizedFolder): Promise<void> {
  let folderStat;

  try {
    folderStat = await lstat(folder.path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT") {
      throw new CliValidationError(`Target disappeared before deletion: ${folder.path}`);
    }

    throw error;
  }

  if (folderStat.isSymbolicLink()) {
    throw new CliValidationError(`Refusing to delete symlink target: ${folder.path}`);
  }

  if (!folderStat.isDirectory()) {
    throw new CliValidationError(`Deletion target is no longer a directory: ${folder.path}`);
  }

  if (basename(folder.path) !== folder.name) {
    throw new CliValidationError(`Deletion target no longer matches expected folder name: ${folder.path}`);
  }
}

export async function deleteFolders(folders: SizedFolder[]): Promise<DeletionResult[]> {
  const results: DeletionResult[] = [];

  for (const folder of folders) {
    results.push(await deleteFolder(folder));
  }

  return results;
}
