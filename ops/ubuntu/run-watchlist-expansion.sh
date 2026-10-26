#!/usr/bin/env bash
set -euo pipefail
root="${METALS_CALENDAR_HOME:-$HOME/.local/share/metals-calendar}"
source_repo="${METALS_CALENDAR_REPO:-$root/control}"
state_dir="$root/state"
runs_dir="$root/runs"
repo="${GH_REPO:-ko-ya346/metal-live-schedule-japan}"
node_bin="${METALS_NODE_BIN:-$root/runtime/node-v24.21.0-linux-x64/bin}"
export PATH="$node_bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
mkdir -p "$state_dir" "$runs_dir"
exec 9>"$state_dir/watchlist-expansion.lock"
flock -n 9 || exit 0
pending_pr="$(gh pr list --repo "$repo" --state open --base main --limit 100 --json number,headRefName --jq '[.[] | select(.headRefName | startswith("automated-watchlist-expansion-"))] | .[0].number // empty')"
if [[ -n "$pending_pr" ]]; then echo "Watchlist report PR #$pending_pr awaits human review; skipped."; exit 0; fi
git -C "$source_repo" fetch origin main
stamp="$(TZ=Asia/Tokyo date +%Y%m%d-%H%M%S)"
today="$(TZ=Asia/Tokyo date +%Y-%m-%d)"
branch="automated-watchlist-expansion-$stamp"
worktree="$runs_dir/$branch"
cleanup() { git -C "$source_repo" worktree remove --force "$worktree" >/dev/null 2>&1 || true; git -C "$source_repo" branch -D "$branch" >/dev/null 2>&1 || true; }
trap cleanup EXIT
git -C "$source_repo" worktree add -b "$branch" "$worktree" origin/main
cd "$worktree"
npm ci --no-audit --no-fund
npm run research:watchlist-expansion -- --report=watchlist-expansion-report.md --signature=watchlist-expansion-candidates.sha256 > watchlist-expansion-run.log
cp watchlist-expansion-report.md "$state_dir/watchlist-expansion-$stamp.md"
cp watchlist-expansion-run.log "$state_dir/watchlist-expansion-$stamp.log"
if grep -q '既存探索語に含まれない共演者: 0組' watchlist-expansion-report.md; then echo "No candidates; report/log saved."; exit 0; fi
signature="$(cat watchlist-expansion-candidates.sha256)"
signature_file="$state_dir/watchlist-expansion-candidates.sha256"
if [[ -f "$signature_file" && "$(cat "$signature_file")" == "$signature" ]]; then echo "Candidate snapshot unchanged; no duplicate PR."; exit 0; fi
git config user.name "metals-calendar-openweight"
git config user.email "metals-calendar-openweight@users.noreply.github.com"
git add watchlist-expansion-report.md
git commit -m "docs: report domestic co-performer candidates"
git push -u origin "$branch"
{
cat <<'BODY'
## 概要

公開イベントの共演者から、未登録の探索候補を根拠付きで一覧化しました。isInternational=false を国内公演の根拠として使い、個々の出演者の国籍はモデル判定していません。データファイルは変更せず、候補レポートのみです。

## 人間に確認してほしいこと

Metal Calendar の探索範囲に加える出演名義を選んでください。国籍や対象ジャンルの最終判断は人間が行います。

## 対象Issue

#133
BODY
cat watchlist-expansion-report.md
} > watchlist-expansion-pr.md
gh pr create --repo "$repo" --base main --head "$branch" --title "国内共演者の探索候補を報告する $today" --body-file watchlist-expansion-pr.md
cp watchlist-expansion-candidates.sha256 "$signature_file"
