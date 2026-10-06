# Ubuntu提案専用ジョブ（#78の初期段階）

この実装はサイト改善の提案とIssue通知だけを行う。コード編集、候補追加、公開、PR承認、マージは行わない。
自動実装の承認判定や候補抽出モデルの評価は後続段階であり、未実装。

## 配置

- 専用チェックアウト: `~/.local/share/metals-calendar/repo`
- 分離Node: `~/.local/share/metals-calendar/runtime/node/bin/node`（24系）
- Ollama: 既存ユーザーサービス、`127.0.0.1:11434`
- 専用モデル: `metals-review:8b`。`qwen3:8b`から8Kコンテキストの設定を派生させる。
- 実行記録: `~/.local/state/metals-calendar/YYYY-MM-DD/`

アプリ用`.env.local`をこのチェックアウトにコピーしない。起動時に存在すれば失敗として記録する。
Node 24は公式配布物とSHA256チェックを使用し、システムNode 12を変更していない。

## 手動試行

```bash
cd ~/.local/share/metals-calendar/repo
export PATH="$HOME/.local/share/metals-calendar/runtime/node/bin:$PATH"
~/.local/bin/ollama pull qwen3:8b
~/.local/bin/ollama create metals-review:8b -f ops/ubuntu/Modelfile
node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/ubuntu-review.ts prompt-only
node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/ubuntu-review.ts review
```

`prompt-only`は別ディレクトリに保存し、当日の実行結果を上書きしない。
小型モデル向けにページと資料の抜粋を使う。資料の欠落を機能の欠落と解釈しないようプロンプトへ明示するが、人間の確認は必要。
既存Qwen3-VL 4Bは2048/4096の出力上限と思考抑制指定を試したが、3回とも回答未完了だった。Qwen3-8Bでは思考抑制指定・3072出力上限で約33秒で正常なJSONレビューを生成できた。GPU使用メモリは6175MiB。これを初期モデルとする。

生成内容には2026-08-24の古いSearch Consoleレポートに基づく提案と、UIについて根拠の弱い断定があった。推論完了と提案品質の合格は別であり、実装指示へ自動変換しない。

## Issue通知

通知先はこのリポジトリの#78に固定。モデルが通知先や操作を選ぶことはない。
`GH_TOKEN`があればコメントを投稿し、なければ`notification.md`を残す。通知未送信を成功した通知として扱わない。
専用認証は、このリポジトリのIssues読み書きだけを許可したfine-grained token等を用意する。
Mac側の既存トークンをサーバーへコピーしない。

```bash
# GH_TOKENは別途安全に環境へ設定する。コマンド履歴へ値を書かない。
node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/ubuntu-review.ts notify
```

過去分の再送には、その日のフォルダを現在の状態ディレクトリへ移すのでなく、`UBUNTU_REVIEW_DATE=YYYY-MM-DD`を指定する。
同じ日・同じレポートのマーカーをIssueの全コメントから調べ、通信中断後の再送でも二重投稿を避ける。
通知処理は直列で動かす。複数ホストから同時送信する運用には対応しない。
モデルの子プロセスへGH_TOKENは渡さない。ただし同一OSユーザーで実行するため、これは悪意あるコードに対する隔離環境ではない。

## 定期実行（マージと手動検証後）

同梱unitは週1回・日曜05:00 JSTの試行用。既存GitHub Actionsのレビューは変更していない。
本運用へ切り替える際は、既存`.github/workflows/site-review.yml`のschedule停止と専用認証設定を同じ移行作業で行い、二重実行を防ぐ。
手動試行のPR段階ではtimerを有効にしない。

```bash
mkdir -p ~/.config/systemd/user ~/.local/state/metals-calendar
cp ops/ubuntu/metals-review.service ops/ubuntu/metals-review.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user start metals-review.service
journalctl --user -u metals-review.service --no-pager -n 50
# 手動結果・通知・既存スケジュール停止を確認後
systemctl --user enable --now metals-review.timer
```

認証設定は`~/.config/metals-calendar/review.env`（0600）へ`GH_TOKEN=...`形式で置ける。リポジトリ管理外とする。
現在Linger=noのため、ログアウト後も定期実行するには`loginctl enable-linger`の設定が必要。既存ユーザーサービス全体に影響するので移行作業として確認する。

## 失敗・復旧・停止

- モデル未導入、API失敗、回答空、設定不備は`finished.json`にfailedとして残し、通知本文を作る。
- 当日完了済みの再実行は推論せず通知だけ再送する。失敗済みは終了コード1を維持する。
- 修正後に再評価する場合は`UBUNTU_REVIEW_STATE_DIR`へ別の試行用ディレクトリを指定し、失敗記録を保存する。
- `review.lock/owner.json`のPIDと実行状況を確認する。強制終了後の古いロックは、人間が稼働プロセス不在を確認して削除する。自動解除しない。
- HTTP推論は10分、子プロセスは20分、systemdは25分で停止する。
- `systemctl --user disable --now metals-review.timer`で定期実行を止める。既存Ollama・他のアプリは止めない。
- 試行中は既存draw2cadジョブがGPUを使っていない時間に実行する。このロックはMetals Calendarジョブ間だけであり他用途のGPU排他制御ではない。

## 検証

```bash
node scripts/check-ubuntu-review.mjs
npm run lint
npm run data:validate
npm run copy:check
npm run build
```

軽量チェックは一時ディレクトリと偽APIだけで動く。モデル・GitHubへの実通信は行わない。
