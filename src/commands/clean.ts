import { deleteFolders } from "../core/cleaner";
import { promptForConfirmation } from "../utils/logger";
import { logger } from "../utils/logger";
import {
  normalizeCustomFolders,
  normalizeTargetFolders,
  resolveRoot,
  scanAndMeasureFoldersWithOptions,
  validateCleanRoot,
  validateCustomFoldersForCleaning
} from "../core/scanner";

interface CleanOptions {
  all?: boolean;
  allowBroadRoot?: boolean;
  allowDangerousCustom?: boolean;
  custom?: string[];
  target?: string[];
}

export async function cleanCommand(root: string, options: CleanOptions): Promise<void> {
  const resolvedRoot = await resolveRoot(root);
  validateCleanRoot(resolvedRoot, options.allowBroadRoot);

  const customFolders = normalizeCustomFolders(options.custom);
  validateCustomFoldersForCleaning(customFolders, options.allowDangerousCustom);

  const targetFolders = [
    ...(normalizeTargetFolders(options.target) ?? []),
    ...(customFolders ?? [])
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

  const requiresTypedConfirmation = (customFolders?.length ?? 0) > 0 || options.allowBroadRoot === true;
  const shouldDelete = requiresTypedConfirmation
    ? await promptForConfirmation('Type "DELETE" to continue: ', "DELETE")
    : options.all ?? (await promptForConfirmation("Delete these folders? [y/N]: "));

  if (!shouldDelete) {
    logger.info("Cleanup cancelled.");
    return;
  }

  const deletionResults = await deleteFolders(result.folders);

  logger.printDeletionSummary(result.root, deletionResults);
}
