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
exec 9>"$state_dir/candidate-collection.lock"
flock -n 9 || exit 0

pending_pr="$(gh pr list --repo "$repo" --state open --base main --limit 100 \
  --json number,headRefName,createdAt \
  --jq '[.[] | select(.headRefName | startswith("automated-candidates"))] | sort_by(.createdAt) | last | .number // empty')"
if [[ -n "$pending_pr" ]]; then
  echo "Candidate PR #$pending_pr is awaiting review; collection skipped."
  systemctl --user try-restart metals-candidate-review.service || true
  exit 0
fi

git -C "$source_repo" fetch origin main
stamp="$(TZ=Asia/Tokyo date +%Y%m%d-%H%M%S)"
today="$(TZ=Asia/Tokyo date +%Y-%m-%d)"
branch="automated-candidates-ubuntu-$stamp"
worktree="$runs_dir/$branch"

cleanup() {
  git -C "$source_repo" worktree remove --force "$worktree" >/dev/null 2>&1 || true
  git -C "$source_repo" branch -D "$branch" >/dev/null 2>&1 || true
}
trap cleanup EXIT

git -C "$source_repo" worktree add -b "$branch" "$worktree" origin/main
cd "$worktree"
npm ci --no-audit --no-fund
npm run research:links > research-links.md

CANDIDATE_LLM_BASE_URL="$base_url" CANDIDATE_LLM_MODEL="$model" \
  npm run research:candidates -- \
  --input=research-links.md \
  --report=candidate-report.md \
  --write \
  --max-total-pages=32

if git diff --quiet -- src/data/candidate_events.ts; then
  echo "No new candidate events."
  exit 0
fi

npm run data:validate
npm run copy:check
npm run build

git config user.name "metals-calendar-openweight"
git config user.email "metals-calendar-openweight@users.noreply.github.com"
git add src/data/candidate_events.ts
git commit -m "data: add open-weight candidate events"
git push -u origin "$branch"

{
  echo "## What"
  echo
  echo "Ubuntuのopen-weightモデルが定期収集した候補イベントです。公開イベントにはまだ反映していません。"
  echo
  echo "## Open-weight output"
  echo
  cat candidate-report.md
  echo
  echo "## Human review"
  echo
  echo "Ubuntuの \`/admin/candidates?queue=new&status=review_needed\` で、採用・修正・対象外を判断してください。確認結果はこのPRへ自動保存されます。"
  echo
  echo "## Validation"
  echo
  echo "- npm run data:validate"
  echo "- npm run copy:check"
  echo "- npm run build"
} > candidate-pr.md

pr_url="$(gh pr create --repo "$repo" --base main --head "$branch" \
  --title "候補イベントを追加する $today" --body-file candidate-pr.md)"
echo "$pr_url"

systemctl --user restart metals-candidate-review.service

