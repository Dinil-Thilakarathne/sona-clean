import fg from "fast-glob";
import { constants as fsConstants } from "node:fs";
import { access, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { getFolderSize } from "./size";

const TARGET_FOLDERS = ["node_modules", ".next", "dist", "build"] as const;
const SIZE_CONCURRENCY = 8;
const TARGET_FOLDER_SET = new Set<string>(TARGET_FOLDERS);

export type TargetFolderName = (typeof TARGET_FOLDERS)[number];
export type FolderPatternName = string;

export interface DetectedFolder {
  name: TargetFolderName;
  path: string;
}

export interface SizedFolder extends DetectedFolder {
  sizeBytes: number;
}

export interface ScanResult {
  root: string;
  folders: SizedFolder[];
  totalSizeBytes: number;
}

export interface ScanProgress {
  totalFolders: number;
  completedFolders: number;
  currentFolder: DetectedFolder;
}

interface ScanOptions {
  targetFolders?: FolderPatternName[];
  onMeasureStart?: (folderCount: number) => void;
  onFolderMeasured?: (progress: ScanProgress) => void;
}

export class CliValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliValidationError";
  }
}

export function getSupportedTargetFolders(): readonly TargetFolderName[] {
  return TARGET_FOLDERS;
}

export function normalizeTargetFolders(targetFolders?: string[]): TargetFolderName[] | undefined {
  if (!targetFolders || targetFolders.length === 0) {
    return undefined;
  }

  const normalized = targetFolders
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  const invalidTargets = normalized.filter((value) => !TARGET_FOLDER_SET.has(value));

  if (invalidTargets.length > 0) {
    throw new CliValidationError(
      `Unsupported target folder(s): ${invalidTargets.join(", ")}. Supported values: ${TARGET_FOLDERS.join(", ")}`
    );
  }

  return Array.from(new Set(normalized)) as TargetFolderName[];
}

export function normalizeCustomFolders(customFolders?: string[]): FolderPatternName[] | undefined {
  if (!customFolders || customFolders.length === 0) {
    return undefined;
  }

  const normalized = customFolders
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return undefined;
  }

  return Array.from(new Set(normalized));
}

export async function resolveRoot(inputPath: string): Promise<string> {
  const absolutePath = path.resolve(inputPath);

  try {
    await access(absolutePath, fsConstants.F_OK);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CliValidationError(`Path not found: ${absolutePath}`);
    }

    throw new CliValidationError(`Unable to access path: ${absolutePath}`);
  }

  let canonicalPath: string;

  try {
    canonicalPath = await realpath(absolutePath);
  } catch {
    throw new CliValidationError(`Unable to resolve path: ${absolutePath}`);
  }

  const rootStat = await stat(canonicalPath);

  if (!rootStat.isDirectory()) {
    throw new CliValidationError(`Path must be a directory: ${canonicalPath}`);
  }

  try {
    await access(canonicalPath, fsConstants.R_OK);
  } catch {
    throw new CliValidationError(`Read permission denied: ${canonicalPath}`);
  }

  return canonicalPath;
}

export async function scanFolders(root: string, targetFolders?: FolderPatternName[]): Promise<DetectedFolder[]> {
  const resolvedRoot = await resolveRoot(root);
  const selectedTargets = targetFolders ?? TARGET_FOLDERS;
  const patterns = selectedTargets.map((folder) => `**/${folder}`);

  const matches = await fg(patterns, {
    cwd: resolvedRoot,
    absolute: true,
    onlyDirectories: true,
    unique: true,
    dot: true,
    suppressErrors: true
  });

  const folders = matches.map((folderPath) => ({
    path: folderPath,
    name: path.basename(folderPath) as DetectedFolder["name"]
  }));

  folders.sort((left, right) => left.path.localeCompare(right.path));
  return folders;
}

export async function scanAndMeasureFolders(root: string): Promise<ScanResult> {
  return scanAndMeasureFoldersWithOptions(root);
}

export async function scanAndMeasureFoldersWithOptions(
  root: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const resolvedRoot = await resolveRoot(root);
  const folders = await scanFolders(resolvedRoot, options.targetFolders);
  const sizedFolders = new Array<SizedFolder>(folders.length);
  let nextIndex = 0;
  let completedFolders = 0;

  options.onMeasureStart?.(folders.length);

  async function worker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= folders.length) {
        return;
      }

      const folder = folders[currentIndex];
      const sizeBytes = await getFolderSize(folder.path);

      sizedFolders[currentIndex] = {
        ...folder,
        sizeBytes
      };

      completedFolders += 1;
      options.onFolderMeasured?.({
        totalFolders: folders.length,
        completedFolders,
        currentFolder: folder
      });
    }
  }

  const workerCount = Math.min(SIZE_CONCURRENCY, folders.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const totalSizeBytes = sizedFolders.reduce((total, folder) => total + folder.sizeBytes, 0);

  return {
    root: resolvedRoot,
    folders: sizedFolders,
    totalSizeBytes
  };
}

export async function listDirectoryEntries(root: string): Promise<string[]> {
  return readdir(root);
}
