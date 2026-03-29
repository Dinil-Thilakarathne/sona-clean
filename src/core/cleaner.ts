import { rm } from "node:fs/promises";
import type { SizedFolder } from "./scanner";

export interface DeletionResult {
  folder: SizedFolder;
  success: boolean;
  error?: string;
}

export async function deleteFolder(folder: SizedFolder): Promise<DeletionResult> {
  try {
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

export async function deleteFolders(folders: SizedFolder[]): Promise<DeletionResult[]> {
  const results: DeletionResult[] = [];

  for (const folder of folders) {
    results.push(await deleteFolder(folder));
  }

  return results;
}
