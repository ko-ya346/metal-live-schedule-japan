# AIサイトレビュー運用

毎朝、Metals Calendarのサイト構成と公開データを眺めて、改善候補をGitHub Issueにするための軽量なAIレビューです。

## 目的

- サイトの見え方、導線、SEO、データ網羅性の気づきを定期的に得る
- 人間が見落としがちな小さな改善点をIssue化する
- コードや公開データは自動変更しない

## 仕組み

GitHub Actions の `Daily site review` が毎朝 08:30 JST に実行されます。

処理内容:

1. 主要ページを取得する
   - `/`
   - `/international`
   - 当月の月別ページ
   - 東京/大阪の地域ページ
   - 直近イベント詳細ページ
2. ローカルデータを要約する
   - `src/data/events.ts`
   - `src/data/candidate_events.ts`
   - `src/data/event_update_candidates.ts`
   - `src/data/discovery.ts`
3. 最新の計測レポートを読む
   - `docs/analytics-reports/`
   - `docs/search-console-reports/`
4. GitHub Actions内でOllamaを起動し、ローカルのオープンウェイトモデルへ送る
5. 改善候補がある場合だけGitHub Issueを作る

## 設定

デフォルトでは外部の有料LLM APIは使いません。

GitHub Actions内でOllamaを起動し、`qwen2.5:1.5b-instruct` をpullして実行します。

任意のGitHub repository variables:

- `SITE_REVIEW_LLM_MODEL`
- `SITE_REVIEW_SITE_URL`

デフォルト値:

- `SITE_REVIEW_LLM_MODEL`: `qwen2.5:1.5b-instruct`
- `SITE_REVIEW_SITE_URL`: `https://metalscalendar.com`

より大きいモデルに変えるとレビュー品質は上がる可能性がありますが、GitHub Actionsの実行時間が長くなります。無料運用では小さめのモデルから始めます。

ローカルでOllamaを使う場合:

- `SITE_REVIEW_LLM_BASE_URL`: `http://localhost:11434/v1`
- `SITE_REVIEW_LLM_MODEL`: ローカルに用意したモデル名

OpenRouterなどの有料APIを使いたい場合は、以下を設定すると同じスクリプトで動きます。

- `SITE_REVIEW_LLM_API_KEY`
- `SITE_REVIEW_LLM_BASE_URL`
- `SITE_REVIEW_LLM_MODEL`

## ローカル実行

```bash
npm run site:review
```

LLMへ送るプロンプトだけ確認する場合:

```bash
npm run site:review -- --prompt-only --output=site-review-prompt.md
```

出力:

- `site-review-report.md`
- `site-review-result.json`

## 運用ルール

- このAI社員はIssueを作るだけにする
- 実装は人間またはCodexが別PRで行う
- Issueの提案は必ず人間が取捨選択する
- 毎日のIssueが多すぎる場合は、実行頻度を週2〜3回に落とす
- 低品質なIssueが続く場合は、モデルよりプロンプトと入力データを先に見直す

## 将来の拡張

- GA4 API / Search Console API を直接呼び、最新の数値を毎回渡す
- 既存Issueを読み、重複提案を避ける
- 特定テーマごとに担当を分ける
  - SEO担当
  - モバイルUX担当
  - データ網羅性担当
  - 送客改善担当
- 十分に精度が上がったら、Issueではなく下書きPR作成まで拡張する
