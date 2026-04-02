# Changelog

All notable changes to this project will be documented in this file.

## 0.1.0 - 2026-04-02

- Initial public release of `sona-clean`
- Added workspace scanning for `node_modules`, `.next`, `dist`, and `build`
- Added reclaimable-size reporting grouped by top-level project
- Added cleanup with confirmation and `--all` support for safe built-in cleanup
- Added `--target` for built-in generated folder filtering
- Added `--custom` for custom folder-name scanning and cleanup
- Added progress output for larger scans
- Added path validation and clearer CLI error messages
- Added cleanup safety protections:
  - broad-root protection
  - dangerous custom-folder denylist
  - typed confirmation for custom cleanup
  - symlink refusal and deletion target revalidation
- Added test coverage for scan, clean, safety, and validation flows
