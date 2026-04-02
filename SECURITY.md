# Security Policy

## Supported versions

Security fixes will be applied to the latest published release line.

## Reporting a vulnerability

Please do not open public issues for destructive cleanup or security-sensitive findings before reporting them privately.

Report security issues by contacting:

- GitHub Security Advisories for this repository, if enabled
- or by opening a private report to the maintainer

Include:

- affected version
- operating system
- exact command used
- expected behavior
- actual behavior
- steps to reproduce
- why you believe the issue has security impact

## What counts as a security issue here

Examples:

- deleting folders outside the intended target set
- bypassing broad-root protections
- bypassing dangerous custom-folder protections
- unsafe symlink handling
- cleanup behavior that can unexpectedly remove non-generated project data

## What does not usually count

- expected refusal to clean dangerous roots or custom names
- performance issues without safety impact
- missing features or UX preferences
