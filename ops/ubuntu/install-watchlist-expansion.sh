#!/usr/bin/env bash
set -euo pipefail

root="${METALS_CALENDAR_HOME:-$HOME/.local/share/metals-calendar}"
source_repo="${METALS_CALENDAR_REPO:-$root/control}"
installed_ops="$root/ops/ubuntu"
units="$HOME/.config/systemd/user"

mkdir -p "$installed_ops" "$units"
git -C "$source_repo" fetch origin main
git -C "$source_repo" show origin/main:ops/ubuntu/run-watchlist-expansion.sh > "$installed_ops/run-watchlist-expansion.sh"
git -C "$source_repo" show origin/main:ops/ubuntu/metals-watchlist-expansion.service > "$units/metals-watchlist-expansion.service"
git -C "$source_repo" show origin/main:ops/ubuntu/metals-watchlist-expansion.timer > "$units/metals-watchlist-expansion.timer"
chmod 0755 "$installed_ops/run-watchlist-expansion.sh"
systemctl --user daemon-reload
systemctl --user enable --now metals-watchlist-expansion.timer
systemctl --user --no-pager status metals-watchlist-expansion.timer
