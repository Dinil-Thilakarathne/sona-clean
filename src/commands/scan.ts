import { scanAndMeasureFolders } from "../core/scanner";
import { logger } from "../utils/logger";

export async function scanCommand(root: string): Promise<void> {
  const result = await scanAndMeasureFolders(root);

  logger.printScanSummary(result);
}
