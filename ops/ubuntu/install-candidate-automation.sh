#!/usr/bin/env bash
set -euo pipefail

root="${METALS_CALENDAR_HOME:-$HOME/.local/share/metals-calendar}"
source_repo="${METALS_CALENDAR_BOOTSTRAP_REPO:-$root/repo}"
control="$root/control"
installed_ops="$root/ops/ubuntu"
units="$HOME/.config/systemd/user"

mkdir -p "$root/ops" "$units"
git -C "$source_repo" fetch origin main
if [[ ! -e "$control/.git" ]]; then
  git -C "$source_repo" worktree add --detach "$control" origin/main
else
  git -C "$control" reset --hard origin/main
fi

mkdir -p "$installed_ops"
cp ops/ubuntu/run-candidate-collection.sh "$installed_ops/"
cp ops/ubuntu/run-event-update-audit.sh "$installed_ops/"
cp ops/ubuntu/serve-candidate-review.sh "$installed_ops/"
chmod 0755 "$installed_ops"/*.sh

cp ops/ubuntu/metals-candidate-collection.service "$units/"
cp ops/ubuntu/metals-candidate-collection.timer "$units/"
cp ops/ubuntu/metals-event-update-audit.service "$units/"
cp ops/ubuntu/metals-event-update-audit.timer "$units/"
cp ops/ubuntu/metals-candidate-review.service "$units/"

systemctl --user daemon-reload
systemctl --user enable --now metals-candidate-review.service
systemctl --user enable --now metals-candidate-collection.timer
systemctl --user enable --now metals-event-update-audit.timer

systemctl --user --no-pager status metals-candidate-review.service
systemctl --user list-timers --all --no-pager | grep -E "metals-(candidate|event-update)"

