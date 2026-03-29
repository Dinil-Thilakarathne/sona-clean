import fg from "fast-glob";
import { access, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { getFolderSize } from "./size";

const TARGET_FOLDERS = ["node_modules", ".next", "dist", "build"] as const;

export interface DetectedFolder {
  name: (typeof TARGET_FOLDERS)[number];
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

export async function resolveRoot(inputPath: string): Promise<string> {
  const absolutePath = path.resolve(inputPath);

  await access(absolutePath);
  const canonicalPath = await realpath(absolutePath);

  const rootStat = await stat(canonicalPath);

  if (!rootStat.isDirectory()) {
    throw new Error(`Path is not a directory: ${canonicalPath}`);
  }

  return canonicalPath;
}

export async function scanFolders(root: string): Promise<DetectedFolder[]> {
  const resolvedRoot = await resolveRoot(root);
  const patterns = TARGET_FOLDERS.map((folder) => `**/${folder}`);

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
  const resolvedRoot = await resolveRoot(root);
  const folders = await scanFolders(resolvedRoot);
  const sizedFolders: SizedFolder[] = [];

  for (const folder of folders) {
    sizedFolders.push({
      ...folder,
      sizeBytes: await getFolderSize(folder.path)
    });
  }

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
