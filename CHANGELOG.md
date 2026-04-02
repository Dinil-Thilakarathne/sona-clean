# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0](https://github.com/Dinil-Thilakarathne/sona-clean/compare/sona-clean-v0.1.0...sona-clean-v0.2.0) (2026-04-02)


### Features

* add custom target support, scan progress tracking, project-based grouping ([296bb8c](https://github.com/Dinil-Thilakarathne/sona-clean/commit/296bb8c51a8960ae84640c2b6c51bb4df0286fd1))
* initialize project with CLI for scanning and cleaning generated folders ([75b8b66](https://github.com/Dinil-Thilakarathne/sona-clean/commit/75b8b66756cb33027e40c678ccb270acd71dbc90))


### Bug Fixes

* test commit of ci workflow ([1ae5059](https://github.com/Dinil-Thilakarathne/sona-clean/commit/1ae50590dbabe441c3f7144bb963c4ecf8b3ccbb))

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
