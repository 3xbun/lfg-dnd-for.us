#!/usr/bin/env bash
# Push this repo to GitHub using a PAT from ~/.hermes/github.env, then scrub the
# token out of .git/config so it is not left behind.
#
# The token must NEVER be committed, echoed, or written into the remote URL
# permanently — see the obsidian-vault-sync skill's "Scrub the token" pitfall.
set -euo pipefail

REPO="$HOME/lfg-dnd-for-us"
ENVF="$HOME/.hermes/github.env"
REMOTE_CLEAN="https://github.com/3xbun/lfg-dnd-for.us"

[[ -f "$ENVF" ]] || { echo "missing $ENVF (expected: GITHUB_TOKEN=...)" >&2; exit 1; }
# shellcheck disable=SC1090
source "$ENVF"
[[ -n "${GITHUB_TOKEN:-}" ]] || { echo "GITHUB_TOKEN not set in $ENVF" >&2; exit 1; }

cd "$REPO"

# push with an ephemeral authenticated URL, then immediately restore the clean one
git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/3xbun/lfg-dnd-for.us.git"

# scrub BEFORE verifying: the EXIT trap covers the failure path, but checking
# first made the script always print "STILL PRESENT" on a successful run.
gone() { git remote set-url origin "$REMOTE_CLEAN"; }
trap gone EXIT
git push -u origin main
gone
trap - EXIT

echo
echo "push ok — remote url restored to:"
git remote -v
echo
echo "verify the token is gone from .git/config:"
if git config --local --get remote.origin.url | grep -q "x-access-token"; then
  echo "  STILL PRESENT - scrubbing" >&2
  git remote set-url origin "$REMOTE_CLEAN"
  exit 1
fi
echo "  clean"
