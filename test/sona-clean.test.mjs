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

test("scan groups output by top-level project prefix under the scan root", async () => {
  const root = await createWorkspaceFixture();
  const result = await runCli(["scan", root]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /A\/node_modules \(1 folder\)/);
  assert.match(result.stdout, /A\/dist \(1 folder\)/);
  assert.match(result.stdout, /B\/node_modules \(1 folder\)/);
  assert.match(result.stdout, /B\/dist \(1 folder\)/);
});
