import {
  normalizeCustomFolders,
  normalizeTargetFolders,
  scanAndMeasureFoldersWithOptions
} from "../core/scanner";
import { logger } from "../utils/logger";

interface ScanOptions {
  custom?: string[];
  target?: string[];
}

export async function scanCommand(root: string, options: ScanOptions): Promise<void> {
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
}
