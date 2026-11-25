#!/usr/bin/env bash
set -euo pipefail

root="${METALS_CALENDAR_HOME:-$HOME/.local/share/metals-calendar}"
source_repo="${METALS_CALENDAR_REPO:-$root/control}"
units="$HOME/.config/systemd/user"
mode="${1:-activate}"
if [[ "$mode" != "activate" && "$mode" != "install-only" ]]; then
  echo "Usage: $0 [activate|install-only]" >&2
  exit 2
fi

mkdir -p "$units"
git -C "$source_repo" fetch origin main
git -C "$source_repo" show origin/main:ops/ubuntu/metals-watchlist-expansion.service > "$units/metals-watchlist-expansion.service"
git -C "$source_repo" show origin/main:ops/ubuntu/metals-watchlist-expansion.timer > "$units/metals-watchlist-expansion.timer"
git -C "$source_repo" config core.hooksPath ops/ubuntu/git-hooks
systemctl --user daemon-reload
if [[ "$mode" == "activate" ]]; then
  systemctl --user enable --now metals-watchlist-expansion.timer
  systemctl --user --no-pager status metals-watchlist-expansion.timer
else
  echo "Installed units and reloaded systemd; timer state was left unchanged."
fi
