import { constants as fsConstants } from "node:fs";
import { access, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { getFolderSize } from "./size";

const TARGET_FOLDERS = ["node_modules", ".next", "dist", "build"] as const;
const SIZE_CONCURRENCY = 8;
const TARGET_FOLDER_SET = new Set<string>(TARGET_FOLDERS);
const DANGEROUS_CUSTOM_FOLDERS = new Set([
  ".git",
  ".github",
  ".ssh",
  ".config",
  "src",
  "app",
  "lib",
  "bin",
  "Documents",
  "Desktop",
  "Downloads",
  "Library"
]);

export type TargetFolderName = (typeof TARGET_FOLDERS)[number];
export type FolderPatternName = string;

export interface DetectedFolder {
  name: FolderPatternName;
  path: string;
}

export interface SizedFolder extends DetectedFolder {
  sizeBytes: number;
}

export interface ScanResult {
  root: string;
  folders: SizedFolder[];
  totalSizeBytes: number;
  warnings: string[];
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

export function getDangerousCustomFolders(): readonly string[] {
  return Array.from(DANGEROUS_CUSTOM_FOLDERS).sort();
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

export function validateCustomFoldersForCleaning(
  customFolders?: FolderPatternName[],
  allowDangerousCustom?: boolean
): void {
  if (!customFolders || customFolders.length === 0 || allowDangerousCustom) {
    return;
  }

  const dangerousFolders = customFolders.filter((folder) => DANGEROUS_CUSTOM_FOLDERS.has(folder));

  if (dangerousFolders.length > 0) {
    throw new CliValidationError(
      `Refusing dangerous custom folder(s): ${dangerousFolders.join(", ")}. Use --allow-dangerous-custom to continue.`
    );
  }
}

export function validateCleanRoot(root: string, allowBroadRoot?: boolean): void {
  if (allowBroadRoot || !isBroadRoot(root)) {
    return;
  }

  throw new CliValidationError(`Refusing to clean broad root: ${root}. Use --allow-broad-root to continue.`);
}

function isBroadRoot(root: string): boolean {
  const resolvedRoot = path.resolve(root);
  const homeDirectory = process.env.HOME ? path.resolve(process.env.HOME) : null;
  const pathParts = resolvedRoot.split(path.sep).filter(Boolean);
  const protectedRoots = new Set(["/", "/Users", "/tmp", "/private/tmp", "/var", "/private/var"]);

  return protectedRoots.has(resolvedRoot) || resolvedRoot === homeDirectory || pathParts.length <= 1;
}

async function walkForFolders(
  directory: string,
  selectedTargets: Set<FolderPatternName>,
  matches: DetectedFolder[],
  warnings: string[]
): Promise<void> {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "EACCES" || code === "EPERM") {
      warnings.push(`Skipped unreadable directory: ${directory}`);
      return;
    }

    throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (selectedTargets.has(entry.name)) {
      matches.push({
        path: fullPath,
        name: entry.name
      });
      continue;
    }

    await walkForFolders(fullPath, selectedTargets, matches, warnings);
  }
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
  const result = await scanFoldersWithWarnings(root, targetFolders);
  return result.folders;
}

export async function scanFoldersWithWarnings(
  root: string,
  targetFolders?: FolderPatternName[]
): Promise<{ folders: DetectedFolder[]; warnings: string[] }> {
  const resolvedRoot = await resolveRoot(root);
  const selectedTargets = new Set(targetFolders ?? TARGET_FOLDERS);
  const folders: DetectedFolder[] = [];
  const warnings: string[] = [];

  await walkForFolders(resolvedRoot, selectedTargets, folders, warnings);

  folders.sort((left, right) => left.path.localeCompare(right.path));
  return { folders, warnings };
}

export async function scanAndMeasureFolders(root: string): Promise<ScanResult> {
  return scanAndMeasureFoldersWithOptions(root);
}

export async function scanAndMeasureFoldersWithOptions(
  root: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const resolvedRoot = await resolveRoot(root);
  const { folders, warnings } = await scanFoldersWithWarnings(resolvedRoot, options.targetFolders);
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
    totalSizeBytes,
    warnings
  };
}

export async function listDirectoryEntries(root: string): Promise<string[]> {
  return readdir(root);
}
