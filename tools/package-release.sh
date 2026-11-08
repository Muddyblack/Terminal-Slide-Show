#!/usr/bin/env bash
#
# Builds the release tarball used by the Ansible role: the production backend
# (with its dependencies) plus the built frontend. It is plain JavaScript, so
# one archive runs on every Raspberry Pi model.
#
# Usage: tools/package-release.sh <version> [output-dir]

set -euo pipefail

version="${1:?Usage: $0 <version> [output-dir]}"
out_dir="$(realpath -m "${2:-dist-release}")"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
name="terminal-slide-show-${version}"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

echo "Building frontend..."
npm ci --prefix "$root/client"
npm run build --prefix "$root/client"

echo "Assembling $name..."
mkdir -p "$stage/$name/server" "$stage/$name/client"
cp -r "$root/client/dist" "$stage/$name/client/dist"

for path in src data package.json package-lock.json; do
    cp -r "$root/server/$path" "$stage/$name/server/"
done

# Only code and defaults: never copy .env files or service account keys
mkdir "$stage/$name/server/config"
cp "$root/server/config/config.js" "$root/server/config/frontend.config.js" \
   "$root/server/config/.env.example" "$stage/$name/server/config/"

npm ci --omit=dev --prefix "$stage/$name/server"

echo "$version" > "$stage/$name/VERSION"

mkdir -p "$out_dir"
tar --sort=name --owner=0 --group=0 --numeric-owner \
    -czf "$out_dir/$name.tar.gz" -C "$stage" "$name"
(cd "$out_dir" && sha256sum "$name.tar.gz" > "$name.tar.gz.sha256")

echo "Wrote $out_dir/$name.tar.gz"
cat "$out_dir/$name.tar.gz.sha256"
