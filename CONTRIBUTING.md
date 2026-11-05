# Contributing

Thanks for helping out. Bug reports, fixes and small features are all welcome.

## Setup

You need Node.js 24 (`nix develop` provides it).

```bash
npm install && npm install --prefix client && npm install --prefix server
cp server/config/.env.example server/config/.env
npm run dev
```

## Pull requests

1. Fork the repo and branch from `master`.
2. Keep changes focused; one topic per PR.
3. Run `npm test` in `server/` and `npm run typecheck` in `client/`, plus `npm run lint` in `client/`. If you touched `ansible/`, run `ansible-lint` there. CI runs the tests, the typecheck, the build and `ansible-lint`.
4. Describe what changed and why, and include a screenshot for UI changes.

## Releases

The version lives in one place: `version` in the root `package.json`. `scripts/version.mjs` copies it to the other files that carry one (client and server packages, lockfiles, `ansible/galaxy.yml`), and CI fails if they differ. Never edit those by hand.

```bash
make tag        # asks patch/minor/major, bumps the version on release/vX.Y.Z and opens a PR
make tag-beta   # same, as a pre-release (no :latest image)
```

Merging that PR is the release. `release.yml` runs the whole CI suite on the merge commit, builds the tarball (with its `.sha256`) and the backend and frontend Docker images (amd64 and arm64, pushed to GHCR), then creates the `vX.Y.Z` tag and the GitHub release with notes grouped by commit type (`feat:`, `fix:`, `feat!:` for breaking changes). Nothing is tagged by hand, and a failed build leaves no tag behind. Re-run failed jobs instead of starting over.

## Demo page

`make demo` (or `npm run dev:demo` in `client/`) runs the UI with made-up data and no server. The same build is published to GitHub Pages by `pages.yml` on every change to the client. The demo data is in `client/src/demo` and `client/public/demo`; it never contains real content. One-time setup: Settings → Pages → Source: GitHub Actions.

## Reporting bugs

Open an issue with what you expected, what happened, and your setup (Docker, bare metal or the Ansible role; browser or MPV display). Set `LOG_LEVEL=debug` and attach relevant logs.
