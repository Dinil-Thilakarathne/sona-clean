# Contributing

Thanks for contributing to `sona-clean`.

## Development setup

```bash
git clone https://github.com/Dinil-Thilakarathne/sona-clean.git
cd sona-clean
npm install
npm run build
npm test
```

For local CLI testing:

```bash
npm link
sona-clean --help
```

## Development workflow

- Keep changes focused and small when possible
- Prefer improving safety and clarity over adding flexibility by default
- Preserve the current CLI contract unless the change is intentional and documented
- Update the README when command behavior or flags change
- Add or update tests for behavior changes

## Pull requests

Before opening a PR:

- Run `npm run build`
- Run `npm test`
- Check `sona-clean scan --help`
- Check `sona-clean clean --help`

PRs should include:

- a short description of the change
- the user-facing impact
- any safety implications, especially for cleanup behavior
- updated tests if behavior changed

## Release workflow

This repository uses Release Please for version bumps, changelog updates, tags, and GitHub releases.

To make releases readable:

- use clear PR titles
- prefer conventional commit-style summaries when possible
- call out breaking changes explicitly
- mention user-facing CLI changes in the PR description

Release Please will open or update a release PR from `main`. Merging that PR updates:

- `package.json` version
- `CHANGELOG.md`
- the git release tag
- the GitHub release

## Bug reports

When reporting bugs, include:

- OS and Node.js version
- exact command used
- expected behavior
- actual behavior
- sample output or error message

## Feature requests

Feature requests are welcome, but please keep the project goals in mind:

- safe cleanup of generated folders
- clear disk-usage visibility
- practical CLI UX

If a feature increases deletion risk, it should come with a strong safety story.
