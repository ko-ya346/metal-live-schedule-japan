#!/usr/bin/env bash
set -euo pipefail

root="${METALS_CALENDAR_HOME:-$HOME/.local/share/metals-calendar}"
source_repo="${METALS_CALENDAR_REPO:-$root/control}"
units="$HOME/.config/systemd/user"

mkdir -p "$units"
git -C "$source_repo" fetch origin main
git -C "$source_repo" show origin/main:ops/ubuntu/metals-watchlist-expansion.service > "$units/metals-watchlist-expansion.service"
git -C "$source_repo" show origin/main:ops/ubuntu/metals-watchlist-expansion.timer > "$units/metals-watchlist-expansion.timer"
systemctl --user daemon-reload
systemctl --user enable --now metals-watchlist-expansion.timer
systemctl --user --no-pager status metals-watchlist-expansion.timer
