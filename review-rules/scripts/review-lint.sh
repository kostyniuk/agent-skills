#!/usr/bin/env bash
# Mechanical review rules, checked on the added lines of a branch diff.
# usage: review-lint.sh [base]   (default $REVIEW_LINT_BASE or origin/main; run inside the repo/worktree)
# Exit 1 when anything is found. Judgement rules stay in SKILL.md.
# Every pattern below can be overridden with the environment variable of the same name.

DAO_TEST_GLOB=${DAO_TEST_GLOB:-'dao/*.test.js|dao/*.test.ts|*/dao/*.test.js|*/dao/*.test.ts'}
TRANSPORT_TEST_GLOB=${TRANSPORT_TEST_GLOB:-'*impl.test.js|*impl.test.ts|*/impl/*.test.js|*/impl/*.test.ts'}
SHARED_MODELS_REPO=${SHARED_MODELS_REPO:-shared-models}
SHARED_LIB_REPOS=${SHARED_LIB_REPOS:-"$SHARED_MODELS_REPO shared-backend"}
BANNED_CALLS_RE=${BANNED_CALLS_RE:-'\.unscoped\(|\.get\(\{[[:space:]]*plain:[[:space:]]*true'}
TEST_MODEL_CALL_RE=${TEST_MODEL_CALL_RE:-'models\.[A-Z][A-Za-z]*\.(update|create|destroy|bulkCreate)\('}
INTERNAL_SCOPE=${INTERNAL_SCOPE:-'@your-org/'}
COMMENT_RE=${COMMENT_RE:-'^[[:space:]]*(//|/\*|\{/\*|#)'}
ALLOWED_DISABLE_RE=${ALLOWED_DISABLE_RE:-'(oxlint|eslint|prettier|ts|biome)-(disable|ignore|expect-error)|^[[:space:]]*#!'}

base=${1:-${REVIEW_LINT_BASE:-origin/main}}
repo=$(basename "$(git rev-parse --show-toplevel)")
range="$(git merge-base "$base" HEAD)...HEAD"
found=0
hit() { echo "$1"; found=1; }
matches_glob() { local f=$1 globs=$2 g; IFS='|' read -ra parts <<<"$globs"; for g in "${parts[@]}"; do [[ "$f" == $g ]] && return 0; done; return 1; }
is_shared_lib() { [[ " $SHARED_LIB_REPOS " == *" $repo "* ]]; }

while IFS= read -r f; do
  [ -n "$f" ] || continue
  matches_glob "$f" "$DAO_TEST_GLOB" && hit "DAO test file (cover via the API route or helper test): $f"
  matches_glob "$f" "$TRANSPORT_TEST_GLOB" && hit "Test for an external transport client: $f"
  if [ "$repo" = "$SHARED_MODELS_REPO" ] && [[ "$f" == *.test.* ]]; then hit "Test added in the shared models package (test in the consumer service): $f"; fi
done < <(git diff --name-only --diff-filter=A "$range")

while IFS= read -r line; do
  file=${line%%:*}; text=${line#*:}
  if [[ "$text" =~ $BANNED_CALLS_RE ]]; then hit "$file: banned ORM call — $text"; fi
  if [[ "$file" == *.test.* && "$text" =~ $TEST_MODEL_CALL_RE ]]; then hit "$file: ORM model call in a test (use DAO methods in a transaction) — $text"; fi
  if [[ "$file" != *.test.* && "$file" != *.md && "$text" =~ $COMMENT_RE && ! "$text" =~ $ALLOWED_DISABLE_RE ]]; then hit "$file: added comment — $text"; fi
  if [[ "$file" == package.json ]] && ! is_shared_lib && [[ "$text" == *"\"$INTERNAL_SCOPE"* ]]; then hit "$file: internal package version change (push package.json unchanged) — $text"; fi
done < <(git diff -U0 "$range" | awk '/^\+\+\+ b\//{f=substr($0,7)} /^\+[^+]/{print f ":" substr($0,2)}')

[ $found = 0 ] && echo "review-lint: clean"
exit $found
