import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = "/Users/dinilthilakarathne/repos/open-sources/sona-clean";
const cliEntry = path.join(projectRoot, "dist", "index.js");

async function createFixtureTree() {
  const root = await mkdtemp(path.join(os.tmpdir(), "sona-clean-"));

  await mkdir(path.join(root, "app", "node_modules", "pkg"), { recursive: true });
  await mkdir(path.join(root, "app", ".next", "cache"), { recursive: true });
  await mkdir(path.join(root, "app", "dist"), { recursive: true });
  await mkdir(path.join(root, "app", "src"), { recursive: true });
  await mkdir(path.join(root, "lib", "build"), { recursive: true });

  await writeFile(path.join(root, "app", "node_modules", "pkg", "index.js"), "console.log('x');");
  await writeFile(path.join(root, "app", ".next", "cache", "data.bin"), "1234567890");
  await writeFile(path.join(root, "app", "dist", "bundle.js"), "bundle");
  await writeFile(path.join(root, "lib", "build", "artifact.txt"), "artifact");
  await writeFile(path.join(root, "app", "src", "keep.ts"), "export const keep = true;");

  return root;
}

async function createCustomFixtureTree() {
  const root = await mkdtemp(path.join(os.tmpdir(), "sona-clean-custom-"));

  await mkdir(path.join(root, "app", "coverage"), { recursive: true });
  await mkdir(path.join(root, "app", "tmp"), { recursive: true });
  await mkdir(path.join(root, "app", "node_modules", "pkg"), { recursive: true });

  await writeFile(path.join(root, "app", "coverage", "coverage.json"), "report");
  await writeFile(path.join(root, "app", "tmp", "cache.tmp"), "temp");
  await writeFile(path.join(root, "app", "node_modules", "pkg", "index.js"), "console.log('x');");

  return root;
}

async function createWorkspaceFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "sona-clean-workspace-"));

  await mkdir(path.join(root, "A", "app", "node_modules", "pkg"), { recursive: true });
  await mkdir(path.join(root, "A", "packages", "ui", "dist"), { recursive: true });
  await mkdir(path.join(root, "B", "web", "node_modules", "pkg"), { recursive: true });
  await mkdir(path.join(root, "B", "web", "dist"), { recursive: true });

  await writeFile(path.join(root, "A", "app", "node_modules", "pkg", "index.js"), "aaa");
  await writeFile(path.join(root, "A", "packages", "ui", "dist", "bundle.js"), "bbb");
  await writeFile(path.join(root, "B", "web", "node_modules", "pkg", "index.js"), "ccc");
  await writeFile(path.join(root, "B", "web", "dist", "bundle.js"), "ddd");

  return root;
}

function runCli(args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    if (input) {
      child.stdin.write(input);
    }

    child.stdin.end();
  });
}

test("scan reports only supported generated folders", async () => {
  const root = await createFixtureTree();
  const result = await runCli(["scan", root]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /node_modules/);
  assert.match(result.stdout, /\.next/);
  assert.match(result.stdout, /dist/);
  assert.match(result.stdout, /build/);
  assert.match(result.stdout, /Matched folders: 4/);
  assert.doesNotMatch(result.stdout, /src\s+.*keep/);
});

test("clean without confirmation leaves generated folders in place", async () => {
  const root = await createFixtureTree();
  const targetFolder = path.join(root, "app", "node_modules");
  const result = await runCli(["clean", root], { input: "n\n" });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Cleanup cancelled\./);
  await access(targetFolder, fsConstants.F_OK);
});

test("clean --all removes generated folders and preserves unrelated directories", async () => {
  const root = await createFixtureTree();
  const targetFolder = path.join(root, "app", "node_modules");
  const keepFolder = path.join(root, "app", "src");
  const result = await runCli(["clean", root, "--all"]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Deleted folders: 4/);
  await assert.rejects(() => access(targetFolder, fsConstants.F_OK));
  await access(keepFolder, fsConstants.F_OK);
});

test("clean refuses dangerous custom folder names by default", async () => {
  const root = await createFixtureTree();
  const result = await runCli(["clean", root, "--custom", "src", "--all"]);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Error: Refusing dangerous custom folder\(s\): src\./);
});

test("clean refuses broad roots by default", async () => {
  const result = await runCli(["clean", "/tmp", "--target", "dist", "--all"]);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Error: Refusing to clean broad root: \/private\/tmp\. Use --allow-broad-root to continue\./);
});

test("clean with custom folders requires typed confirmation even with --all", async () => {
  const root = await createCustomFixtureTree();
  const targetFolder = path.join(root, "app", "coverage");
  const result = await runCli(["clean", root, "--custom", "coverage", "--all"], { input: "n\n" });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Type "DELETE" to continue:/);
  assert.match(result.stdout, /Cleanup cancelled\./);
  await access(targetFolder, fsConstants.F_OK);
});

test("clean with custom folders deletes only after typed confirmation", async () => {
  const root = await createCustomFixtureTree();
  const targetFolder = path.join(root, "app", "coverage");
  const keepFolder = path.join(root, "app", "node_modules");
  const result = await runCli(["clean", root, "--custom", "coverage", "--all"], { input: "DELETE\n" });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Deleted folders: 1/);
  await assert.rejects(() => access(targetFolder, fsConstants.F_OK));
  await access(keepFolder, fsConstants.F_OK);
});

test("scan groups output by top-level project prefix under the scan root", async () => {
  const root = await createWorkspaceFixture();
  const result = await runCli(["scan", root]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /A\/node_modules \(1 folder\)/);
  assert.match(result.stdout, /A\/dist \(1 folder\)/);
  assert.match(result.stdout, /B\/node_modules \(1 folder\)/);
  assert.match(result.stdout, /B\/dist \(1 folder\)/);
});

test("scan can target a single folder type", async () => {
  const root = await createFixtureTree();
  const result = await runCli(["scan", root, "--target", "dist"]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /dist \(1 folder\)/);
  assert.doesNotMatch(result.stdout, /node_modules/);
  assert.doesNotMatch(result.stdout, /\.next/);
  assert.doesNotMatch(result.stdout, /build/);
});

test("scan can target multiple folder types", async () => {
  const root = await createFixtureTree();
  const result = await runCli(["scan", root, "--target", "dist", "build"]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /dist \(1 folder\)/);
  assert.match(result.stdout, /build \(1 folder\)/);
  assert.doesNotMatch(result.stdout, /node_modules/);
  assert.doesNotMatch(result.stdout, /\.next/);
});

test("scan rejects unsupported target folder names", async () => {
  const root = await createFixtureTree();
  const result = await runCli(["scan", root, "--target", "coverage"]);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Error: Unsupported target folder\(s\): coverage\./);
});

test("scan can target custom folder names", async () => {
  const root = await createCustomFixtureTree();
  const result = await runCli(["scan", root, "--custom", "coverage", "tmp"]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /coverage \(1 folder\)/);
  assert.match(result.stdout, /tmp \(1 folder\)/);
  assert.doesNotMatch(result.stdout, /node_modules/);
});

test("scan can combine built-in and custom folder names", async () => {
  const root = await createCustomFixtureTree();
  const result = await runCli(["scan", root, "--target", "node_modules", "--custom", "coverage"]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /coverage \(1 folder\)/);
  assert.match(result.stdout, /node_modules \(1 folder\)/);
});

test("scan shows a clear error for a missing path", async () => {
  const result = await runCli(["scan", "/path/that/does/not/exist"]);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Error: Path not found: \/path\/that\/does\/not\/exist/);
});

test("scan shows a clear error for a file path", async () => {
  const result = await runCli(["scan", path.join(projectRoot, "package.json")]);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Error: Path must be a directory:/);
});
