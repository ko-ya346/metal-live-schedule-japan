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
exec 9>"$state_dir/watchlist-expansion.lock"
flock -n 9 || exit 0

pending_pr="$(gh pr list --repo "$repo" --state open --base main --limit 100 \
  --json number,headRefName \
  --jq '[.[] | select(.headRefName | startswith("automated-watchlist-expansion-"))] | .[0].number // empty')"
if [[ -n "$pending_pr" ]]; then
  echo "Watchlist expansion PR #$pending_pr is awaiting human review; update skipped."
  exit 0
fi

git -C "$source_repo" fetch origin main
stamp="$(TZ=Asia/Tokyo date +%Y%m%d-%H%M%S)"
today="$(TZ=Asia/Tokyo date +%Y-%m-%d)"
branch="automated-watchlist-expansion-$stamp"
worktree="$runs_dir/$branch"

cleanup() {
  git -C "$source_repo" worktree remove --force "$worktree" >/dev/null 2>&1 || true
  git -C "$source_repo" branch -D "$branch" >/dev/null 2>&1 || true
}
trap cleanup EXIT

git -C "$source_repo" worktree add -b "$branch" "$worktree" origin/main
cd "$worktree"
npm ci --no-audit --no-fund
CANDIDATE_LLM_BASE_URL="$base_url" CANDIDATE_LLM_MODEL="$model" \
  npm run research:watchlist-expansion -- --write --report=watchlist-expansion-report.md \
  > watchlist-expansion-run.log

if git diff --quiet -- src/data/watchTargets.ts; then
  echo "Open-weight model found no validated keyword additions."
  exit 0
fi

npm run data:validate
npm run copy:check
npm run build

git config user.name "metals-calendar-openweight"
git config user.email "metals-calendar-openweight@users.noreply.github.com"
git add src/data/watchTargets.ts watchlist-expansion-report.md
git commit -m "data: expand co-performer discovery keywords"
git push -u origin "$branch"

{
  cat <<'BODY'
## 概要

公開イベントの共演関係から open-weight モデルが選んだ探索キーワード候補です。公開イベント自体は変更していません。

## open-weightモデルの出力

BODY
  cat watchlist-expansion-report.md
  cat <<'BODY'

## 対象Issue

#127 の調査に基づく変更です。

## 人間に確認してほしいこと

候補のジャンル適合性とイベント根拠を確認してください。監視元URLを追加する場合は公式サイトか確認してください。モデル出力から未確認URLを自動登録することはありません。

## 確認

- `npm run data:validate`
- `npm run copy:check`
- `npm run build`
BODY
} > watchlist-expansion-pr.md

gh pr create --repo "$repo" --base main --head "$branch" \
  --title "共演アーティストの探索キーワードを更新する $today" \
  --body-file watchlist-expansion-pr.md
