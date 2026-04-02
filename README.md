# sona-clean

`sona-clean` is a lightweight CLI for reclaiming disk space by scanning and removing generated project folders.

It is built for the common case where development workspaces accumulate large reproducible directories such as `node_modules`, `.next`, `dist`, and `build`.

## Features

- Scan a workspace and find generated folders recursively
- Show reclaimable size before deleting anything
- Clean with confirmation by default
- Group output by top-level project for large workspace scans
- Support built-in safe targets and optional custom folder names

## Install

### Local development

```bash
npm install
npm run build
npm link
```

Then use:

```bash
sona-clean --help
```

### Global install from the project folder

```bash
npm install
npm run build
npm install -g .
```

## Usage

### Scan with built-in targets

```bash
sona-clean scan ~/projects
```

### Clean with confirmation

```bash
sona-clean clean ~/projects
```

### Clean everything without prompting

```bash
sona-clean clean ~/projects --all
```

### Scan only specific built-in folder types

```bash
sona-clean scan ~/projects --target node_modules dist
```

### Scan custom folder names

```bash
sona-clean scan ~/projects --custom coverage tmp
```

### Combine built-in and custom targets

```bash
sona-clean clean ~/projects --target dist --custom coverage --all
```

### Allow broad-root or dangerous custom cleanup explicitly

```bash
sona-clean clean ~/projects --custom coverage --all
sona-clean clean ~/projects --custom src --allow-dangerous-custom
sona-clean clean /tmp --target dist --allow-broad-root
```

## Supported built-in targets

- `node_modules`
- `.next`
- `dist`
- `build`

## CLI Reference

### `sona-clean scan <path>`

Scan a directory recursively, measure matched folders, and print reclaimable space.

Options:

- `-t, --target <folders...>`: limit scanning to built-in generated folders
- `-c, --custom <folders...>`: include custom folder names

### `sona-clean clean <path>`

Scan first, then remove matched folders.

Options:

- `--all`: delete without interactive confirmation
- `-t, --target <folders...>`: limit scanning to built-in generated folders
- `-c, --custom <folders...>`: include custom folder names
- `--allow-broad-root`: allow cleaning broad roots like `/`, `/Users`, or your home directory
- `--allow-dangerous-custom`: allow risky custom names like `.git` or `src`

## Output behavior

- Results are grouped by the first directory under the scan root for better workspace-level readability
- Built-in folder types are aggregated, so large scans do not print hundreds of repetitive lines
- Progress is shown while measuring folder sizes in large workspaces

Example:

```text
Found 386 generated folders. Measuring sizes...

Measured 25/386 folders...
Measured 50/386 folders...

Scanning root: /Users/you/projects

 356.62 MB  finance-track/node_modules (3 folders)
 147.65 MB  finance-track/dist (33 folders)
  91.32 MB  finance-track/.next (1 folder)

 172.25 MB  hintspace/node_modules (28 folders)
  19.29 MB  hintspace/dist (89 folders)

Matched folders: 386
Total reclaimable: 854.56 MB
```

## Safety notes

- `--target` is restricted to built-in generated folder names
- `--custom` is for arbitrary folder names and should be used carefully
- `clean` prompts before deletion unless `--all` is provided
- `clean` refuses broad roots like `/`, `/Users`, `/tmp`, and your home directory unless `--allow-broad-root` is provided
- dangerous custom names like `.git`, `src`, `app`, `lib`, `Documents`, and `Library` are blocked unless `--allow-dangerous-custom` is provided
- custom cleanup requires typing `DELETE` even when `--all` is used
- deletion targets are revalidated before removal, and symlink targets are refused
- unreadable directories are surfaced as scan warnings instead of being silently ignored
- The tool only deletes matched directories, never individual files directly

## Development

```bash
npm install
npm run build
npm test
```

## Release status

This is currently an early `0.1.0` release intended to validate real-world usage and CLI UX.
