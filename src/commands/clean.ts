import { deleteFolders } from "../core/cleaner";
import { promptForConfirmation } from "../utils/logger";
import { logger } from "../utils/logger";
import { scanAndMeasureFolders } from "../core/scanner";

interface CleanOptions {
  all?: boolean;
}

export async function cleanCommand(root: string, options: CleanOptions): Promise<void> {
  const result = await scanAndMeasureFolders(root);

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
