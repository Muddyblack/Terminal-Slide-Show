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

## Reporting bugs

Open an issue with what you expected, what happened, and your setup (Docker, bare metal or the Ansible role; browser or MPV display). Set `LOG_LEVEL=debug` and attach relevant logs.
