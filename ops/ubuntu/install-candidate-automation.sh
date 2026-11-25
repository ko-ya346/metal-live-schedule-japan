#!/usr/bin/env bash
set -euo pipefail

root="${METALS_CALENDAR_HOME:-$HOME/.local/share/metals-calendar}"
source_repo="${METALS_CALENDAR_BOOTSTRAP_REPO:-$root/repo}"
control="$root/control"
units="$HOME/.config/systemd/user"
mode="${1:-activate}"
if [[ "$mode" != "activate" && "$mode" != "install-only" ]]; then
  echo "Usage: $0 [activate|install-only]" >&2
  exit 2
fi

mkdir -p "$root/ops" "$units"
git -C "$source_repo" fetch origin main
if [[ ! -e "$control/.git" ]]; then
  git -C "$source_repo" worktree add --detach "$control" origin/main
else
  git -C "$control" reset --hard origin/main
fi

cp "$control/ops/ubuntu/metals-candidate-collection.service" "$units/"
cp "$control/ops/ubuntu/metals-candidate-collection.timer" "$units/"
cp "$control/ops/ubuntu/metals-event-update-audit.service" "$units/"
cp "$control/ops/ubuntu/metals-event-update-audit.timer" "$units/"
cp "$control/ops/ubuntu/metals-candidate-review.service" "$units/"

git -C "$control" config core.hooksPath ops/ubuntu/git-hooks
systemctl --user daemon-reload
if [[ "$mode" == "activate" ]]; then
  systemctl --user enable --now metals-candidate-review.service
  systemctl --user enable --now metals-candidate-collection.timer
  systemctl --user enable --now metals-event-update-audit.timer
  systemctl --user --no-pager status metals-candidate-review.service
  systemctl --user list-timers --all --no-pager | grep -E "metals-(candidate|event-update)"
else
  echo "Installed units and reloaded systemd; services and timers were left unchanged."
fi

