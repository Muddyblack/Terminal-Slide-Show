#!/usr/bin/env bash
# Start a release: bump the version on a release/vX.Y.Z branch and open a PR.
# Nothing is tagged or pushed to the default branch from here. Merging the PR
# is the release: .github/workflows/release.yml sees the new version on the
# default branch, runs the tests, builds the release tarball and the Docker
# images, then creates the tag and the GitHub release.
#
# The version lives in the root package.json; scripts/version.mjs copies it to
# every other file that carries one (see there).
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"

BETA_FLAG=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        --beta) BETA_FLAG=true; shift ;;
        *) echo "Usage: $0 [--beta]" >&2; exit 1 ;;
    esac
done

cd "$HERE"
command -v gh >/dev/null || { echo "Error: the GitHub CLI (gh) is required to open the PR." >&2; exit 1; }
command -v node >/dev/null || { echo "Error: node is required." >&2; exit 1; }

DEFAULT_BRANCH="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || true)"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)}"
START_BRANCH="$(git branch --show-current)"

echo "Fetching origin..."
git fetch --quiet --tags origin "$DEFAULT_BRANCH"

# ── version bump (relative to what is on the default branch) ─────────────────
CURRENT_VERSION="$(git show "origin/${DEFAULT_BRANCH}:package.json" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0, "utf8")).version || "")')"
[[ -n "$CURRENT_VERSION" ]] || { echo "Error: no version found in package.json on ${DEFAULT_BRANCH}." >&2; exit 1; }

# Split into numeric part and optional suffix (e.g. "2.2.0-beta" → "2.2.0" + "-beta")
NUMERIC="${CURRENT_VERSION%%-*}"
if [[ "$CURRENT_VERSION" == *-* ]]; then
    CURRENT_SUFFIX="-${CURRENT_VERSION#*-}"
else
    CURRENT_SUFFIX=""
fi
IFS='.' read -r MAJOR MINOR PATCH <<< "$NUMERIC"

echo "Current version on ${DEFAULT_BRANCH}: ${CURRENT_VERSION}"
echo ""
echo "Bump type:"
echo "  [p] patch  → ${MAJOR}.${MINOR}.$((PATCH + 1))${CURRENT_SUFFIX}"
echo "  [m] minor  → ${MAJOR}.$((MINOR + 1)).0${CURRENT_SUFFIX}"
echo "  [M] major  → $((MAJOR + 1)).0.0${CURRENT_SUFFIX}"
read -rp "Choice [p/m/M]: " bump_choice

case "$bump_choice" in
    m) NEW_NUMERIC="${MAJOR}.$((MINOR + 1)).0" ;;
    M) NEW_NUMERIC="$((MAJOR + 1)).0.0" ;;
    *) NEW_NUMERIC="${MAJOR}.${MINOR}.$((PATCH + 1))" ;;  # default: patch
esac

if [[ "$BETA_FLAG" == true ]]; then
    NEW_SUFFIX="-beta"
elif [[ -n "$CURRENT_SUFFIX" ]]; then
    read -rp "Remove beta suffix? [y/N]: " remove_beta
    [[ "$remove_beta" =~ ^[Yy]$ ]] && NEW_SUFFIX="" || NEW_SUFFIX="$CURRENT_SUFFIX"
else
    NEW_SUFFIX=""
fi

if [[ -n "$NEW_SUFFIX" && "$NEW_SUFFIX" != "-beta" ]]; then
    echo "Error: only a -beta suffix is supported (got ${NEW_SUFFIX})." >&2
    exit 1
fi

NEW_VERSION="${NEW_NUMERIC}${NEW_SUFFIX}"
TAG_NAME="v${NEW_VERSION}"
RELEASE_BRANCH="release/${TAG_NAME}"

# Releases before the v-prefix were tagged without it
for tag in "$TAG_NAME" "$NEW_VERSION"; do
    if git rev-parse --verify --quiet "refs/tags/${tag}" >/dev/null; then
        echo "Error: tag ${tag} already exists." >&2
        exit 1
    fi
done
if git ls-remote --exit-code --heads origin "$RELEASE_BRANCH" >/dev/null 2>&1; then
    echo "Error: ${RELEASE_BRANCH} already exists on origin (open PR?)." >&2
    exit 1
fi

# ── branch, bump, commit, push, PR ───────────────────────────────────────────
# Branch off the default branch's tip; unrelated local changes stay in the
# working tree and are not part of the release commit.
git switch -c "$RELEASE_BRANCH" "origin/${DEFAULT_BRANCH}"

back_out() {
    local rc=$?
    if (( rc != 0 )); then
        echo "" >&2
        echo "Release aborted; going back to ${START_BRANCH:-the previous branch}." >&2
        git checkout -- . 2>/dev/null || true
        [[ -n "$START_BRANCH" ]] && git switch "$START_BRANCH" 2>/dev/null || true
        git branch -D "$RELEASE_BRANCH" >/dev/null 2>&1 || true
    fi
}
trap back_out EXIT

node scripts/version.mjs set "$NEW_VERSION"
node scripts/version.mjs check
CHANGED="$(git diff --name-only)"
# shellcheck disable=SC2086  # one path per line, none with spaces
git add -- $CHANGED

COMMIT_MSG="chore: release ${TAG_NAME}"
git commit -m "$COMMIT_MSG"

git push -u origin "$RELEASE_BRANCH"

PR_URL="$(gh pr create --base "$DEFAULT_BRANCH" --head "$RELEASE_BRANCH" \
    --title "$COMMIT_MSG" \
    --body "Bumps the version to ${NEW_VERSION}. Merging this PR tests, builds and publishes the release: the tarball, the Docker images and the GitHub release (see .github/workflows/release.yml).")"
echo "$PR_URL"

read -rp "Auto-merge once checks pass? [y/N]: " auto_merge
if [[ "$auto_merge" =~ ^[Yy]$ ]]; then
    gh pr merge "$PR_URL" --auto --squash || echo "Could not enable auto-merge; merge the PR by hand."
fi

trap - EXIT
[[ -n "$START_BRANCH" ]] && git switch "$START_BRANCH"

echo ""
echo "=== Release PR for ${TAG_NAME} is open. Merge it and CI tests, builds and publishes. ==="
