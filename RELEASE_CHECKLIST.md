# Release Checklist

## Before release

- Run `npm install`
- Run `npm run build`
- Run `npm test`
- Verify `sona-clean --help`
- Verify `sona-clean scan <real-workspace-path>`
- Verify `sona-clean clean <real-workspace-path>` and cancel once
- Verify `sona-clean clean <real-workspace-path> --all` on a safe test workspace
- Verify `sona-clean scan <real-workspace-path> --target node_modules dist`
- Verify `sona-clean scan <real-workspace-path> --custom coverage tmp`
- Confirm `README.md` matches actual CLI behavior
- Confirm `package.json` version is correct

## Publish

- Commit the release changes
- Tag the release, for example `v0.1.0`
- Publish with `npm publish`
- Create the GitHub release notes

## After release

- Install from the published package in a clean environment
- Verify the global CLI command works
- Collect first-user feedback on scan speed, output clarity, and cleanup safety
