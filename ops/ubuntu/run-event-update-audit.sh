#!/usr/bin/env bash
set -euo pipefail

root="${METALS_CALENDAR_HOME:-$HOME/.local/share/metals-calendar}"
source_repo="${METALS_CALENDAR_REPO:-$root/control}"
state_dir="$root/state"
runs_dir="$root/runs"
repo="${GH_REPO:-ko-ya346/metal-live-schedule-japan}"
node_bin="${METALS_NODE_BIN:-$root/runtime/node-v24.21.0-linux-x64/bin}"
model="${CANDIDATE_LLM_MODEL:-metals-review:8b}"
base_url="${CANDIDATE_LLM_BASE_URL:-http://127.0.0.1:11434/v1}"

export PATH="$node_bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
mkdir -p "$state_dir" "$runs_dir"
exec 9>"$state_dir/event-update-audit.lock"
flock -n 9 || exit 0

pending_pr="$(gh pr list --repo "$repo" --state open --base main --limit 100 --json number,headRefName \
  --jq '[.[] | select(.headRefName | startswith("automated-candidates"))] | first | .number // empty')"
if [[ -n "$pending_pr" ]]; then
  echo "Candidate PR #$pending_pr is awaiting review; update audit skipped so review stays in one PR."
  exit 0
fi

git -C "$source_repo" fetch origin main
stamp="$(TZ=Asia/Tokyo date +%Y%m%d-%H%M%S)"
today="$(TZ=Asia/Tokyo date +%Y-%m-%d)"
branch="automated-candidates-updates-$stamp"
worktree="$runs_dir/$branch"
cleanup() {
  git -C "$source_repo" worktree remove --force "$worktree" >/dev/null 2>&1 || true
  git -C "$source_repo" branch -D "$branch" >/dev/null 2>&1 || true
}
trap cleanup EXIT

git -C "$source_repo" worktree add -b "$branch" "$worktree" origin/main
cd "$worktree"
if ! node --input-type=commonjs -e 'process.exit(require("./package.json").scripts?.["research:updates"] ? 0 : 1)'; then
  echo "main does not include the published-event audit yet; skipping until the automation PR is merged."
  exit 0
fi
npm ci --no-audit --no-fund
CANDIDATE_LLM_BASE_URL="$base_url" CANDIDATE_LLM_MODEL="$model" \
  npm run research:updates -- --write --max-pages=8 \
  --report="$state_dir/event-update-report-$today.md" \
  --raw-dir="$state_dir/raw-event-updates"

if git diff --quiet -- src/data/event_update_candidates.ts; then
  echo "No published-event update candidates."
  exit 0
fi

npm run data:validate
npm run copy:check
npm run build
git config user.name "metals-calendar-openweight"
git config user.email "metals-calendar-openweight@users.noreply.github.com"
git add src/data/event_update_candidates.ts
git commit -m "data: add published-event update candidates"
git push -u origin "$branch"

gh pr create --repo "$repo" --base main --head "$branch" \
  --title "公開イベントの更新候補を追加する $today" \
  --body "Ubuntuのopen-weightモデルが直近3か月の公開イベントを再確認した更新候補です。公開データへは未適用です。\n\n人間の確認場所: \`/admin/candidates?queue=updates\`\n\n検証: data:validate / copy:check / build"
systemctl --user restart metals-candidate-review.service

