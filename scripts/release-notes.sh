#!/usr/bin/env bash
# Print release notes for the commits since the previous release, grouped by conventional-commit type
# instead of one flat list. Merges and the release-bump commit are left out.
#
#   scripts/release-notes.sh [from-ref] [to-ref]     (defaults: the latest v* tag .. HEAD)
#
# Breaking changes (`feat!:` or a `BREAKING CHANGE:` line in the body) are listed first under
# "Upgrade notes": that is where a user looks before upgrading.
set -euo pipefail

from="${1:-$(git tag --sort=-creatordate | grep -E '^v[0-9]' | sed -n '1p')}"
to="${2:-HEAD}"
range="${from:+$from..}$to"

declare -A section=([feat]="" [fix]="" [perf]="" [other]="")
breaking=""

# Records are NUL-separated; the first line is the subject, the rest the body.
while IFS= read -r -d '' record; do
    record="${record#"${record%%[!$'\n']*}"}"   # git puts a newline between records
    subject="${record%%$'\n'*}"
    body=""; [[ "$record" == *$'\n'* ]] && body="${record#*$'\n'}"

    [[ "$subject" =~ ^Merge\  || "$subject" =~ ^chore:\ release\  ]] && continue

    if [[ "$subject" =~ ^([a-z]+)(\(([^\)]*)\))?(!)?:\ (.+)$ ]]; then
        type="${BASH_REMATCH[1]}" scope="${BASH_REMATCH[3]}" bang="${BASH_REMATCH[4]}" text="${BASH_REMATCH[5]}"
    else
        type=other scope="" bang="" text="$subject"
    fi
    [[ -n "$scope" ]] && text="**${scope}:** ${text}"
    text="$(tr '[:lower:]' '[:upper:]' <<<"${text:0:1}")${text:1}"
    line="- ${text}"$'\n'

    if [[ -n "$bang" || "$body" == *"BREAKING CHANGE"* ]]; then
        note="$(grep -m1 -E '^BREAKING[ -]CHANGE:' <<<"$body" | sed -E 's/^BREAKING[ -]CHANGE:[[:space:]]*//' || true)"
        breaking+="- ${text}${note:+ — ${note}}"$'\n'
    fi

    case "$type" in
        feat) section[feat]+="$line" ;;
        fix) section[fix]+="$line" ;;
        perf) section[perf]+="$line" ;;
        build|ci|chore|docs|test|style|refactor) [[ "$type" == docs ]] && section[other]+="$line" || true ;;
        *) section[other]+="$line" ;;
    esac
done < <(git log "$range" --no-merges --pretty=format:'%s%n%b%x00')

print_section() { [[ -n "$2" ]] && printf '### %s\n%s\n' "$1" "$2" || true; }

print_section "Upgrade notes" "$breaking"
print_section "New" "${section[feat]}"
print_section "Fixed" "${section[fix]}"
print_section "Faster" "${section[perf]}"
print_section "Other" "${section[other]}"
if [[ -z "${section[feat]}${section[fix]}${section[perf]}${section[other]}$breaking" ]]; then
    echo "Maintenance and dependency updates only."
fi
