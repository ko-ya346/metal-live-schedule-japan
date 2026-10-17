#!/usr/bin/env bash
set -euo pipefail

root="${METALS_CALENDAR_HOME:-$HOME/.local/share/metals-calendar}"
source_repo="${METALS_CALENDAR_REPO:-$root/control}"
main_worktree="$root/reviews/main"
repo="${GH_REPO:-ko-ya346/metal-live-schedule-japan}"
node_bin="${METALS_NODE_BIN:-$root/runtime/node-v24.21.0-linux-x64/bin}"

export PATH="$node_bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

pr="$(gh pr list --repo "$repo" --state open --base main --limit 100 \
  --json number,headRefName,createdAt \
  --jq '[.[] | select(.headRefName | startswith("automated-candidates"))] | sort_by(.createdAt) | last | .number // empty')"

if [[ -n "$pr" ]]; then
  echo "Serving writable review environment for PR #$pr"
  cd "$source_repo"
  exec npm run candidates:review -- "$pr"
fi

echo "No open candidate PR; serving current main read-only."
git -C "$source_repo" fetch origin main
if [[ ! -e "$main_worktree/.git" ]]; then
  mkdir -p "$(dirname "$main_worktree")"
  git -C "$source_repo" worktree add --detach "$main_worktree" origin/main
else
  git -C "$main_worktree" reset --hard origin/main
fi

cd "$main_worktree"
npm ci --no-audit --no-fund
npm run build
exec npm run start -- --hostname 127.0.0.1 --port 3001

