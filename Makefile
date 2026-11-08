# One entry point for the repo. Each part keeps its own tooling; these targets only fan out
# to the same commands CI runs.
.PHONY: help install dev test build demo package version-check tag tag-beta check ansible-check

help:
	@echo "make install        install server and client dependencies"
	@echo "make dev            server and client together"
	@echo "make test           server tests"
	@echo "make check          version, tests, typecheck, builds and Ansible checks"
	@echo "make ansible-check  Ansible lint and deployment sequencing tests"
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

check: version-check test ansible-check
	npm run typecheck --prefix client
	npm run build --prefix client
	npm run build:demo --prefix client

ansible-check:
	cd ansible && ansible-lint
	python3 tools/test-ansible.py

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
