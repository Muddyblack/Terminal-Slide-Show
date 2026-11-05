# One entry point for the repo. Each part keeps its own tooling; these targets only fan out
# to the same commands CI runs.
.PHONY: help install dev test build demo package version-check tag tag-beta

help:
	@echo "make install        install server and client dependencies"
	@echo "make dev            server and client together"
	@echo "make test           server tests"
	@echo "make build          build the client"
	@echo "make demo           run the GitHub Pages demo locally (made-up data, no server)"
	@echo "make package        build the release tarball into dist-release/"
	@echo "make version-check  check that every file carries the version of package.json"
	@echo "make tag            start a release: bump the version and open the release PR (merging it publishes)"
	@echo "make tag-beta       same, as a pre-release (no :latest image)"

install:
	npm ci
	npm ci --prefix server
	npm ci --prefix client

dev:
	npm run dev

test:
	npm test --prefix server

build:
	npm run build --prefix client

demo:
	npm run dev:demo --prefix client

package:
	tools/package-release.sh "$$(node scripts/version.mjs get)" dist-release

version-check:
	node scripts/version.mjs check

tag:
	scripts/tag.sh

tag-beta:
	scripts/tag.sh --beta
