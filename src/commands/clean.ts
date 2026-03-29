import { deleteFolders } from "../core/cleaner";
import { promptForConfirmation } from "../utils/logger";
import { logger } from "../utils/logger";
import {
  normalizeCustomFolders,
  normalizeTargetFolders,
  scanAndMeasureFoldersWithOptions
} from "../core/scanner";

interface CleanOptions {
  all?: boolean;
  custom?: string[];
  target?: string[];
}

export async function cleanCommand(root: string, options: CleanOptions): Promise<void> {
  const targetFolders = [
    ...(normalizeTargetFolders(options.target) ?? []),
    ...(normalizeCustomFolders(options.custom) ?? [])
  ];

  const result = await scanAndMeasureFoldersWithOptions(root, {
    targetFolders: targetFolders.length > 0 ? targetFolders : undefined,
    onMeasureStart(folderCount) {
      logger.printMeasureStart(folderCount);
    },
    onFolderMeasured(progress) {
      logger.printMeasureProgress(progress.completedFolders, progress.totalFolders);
    }
  });

  logger.printScanSummary(result);

  if (result.folders.length === 0) {
    return;
  }

  const shouldDelete = options.all ?? (await promptForConfirmation("Delete these folders? [y/N]: "));

  if (!shouldDelete) {
    logger.info("Cleanup cancelled.");
    return;
  }

  const deletionResults = await deleteFolders(result.folders);

  logger.printDeletionSummary(result.root, deletionResults);
}
