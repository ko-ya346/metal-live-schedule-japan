# Search Console API 運用メモ

Search Console のCSVを手で置かずに、検索パフォーマンスの月次レポートを生成する。

## 目的

- 上位クエリ、上位ページ、CTRが低いページを確認する
- Codexに改善案を出しやすくする
- 将来的に改善候補issueの自動作成につなげる

## 必要な設定

Google Cloud で Search Console API を有効化し、サービスアカウントを作成する。

Search Console 側では、対象プロパティにサービスアカウントのメールアドレスをユーザーとして追加する。権限は読み取りでよい。

## 環境変数

`.env.local` に以下を設定する。

```bash
SEARCH_CONSOLE_SITE_URL=sc-domain:metalscalendar.com
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

JSONファイルを使わない場合は、サービスアカウントJSONを文字列で渡すこともできる。

```bash
SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

認証情報は絶対にコミットしない。

## 実行

```bash
npm run analytics:search-console
```

期間を指定する場合:

```bash
npm run analytics:search-console -- --start 2026-07-01 --end 2026-07-31
```

出力先を指定する場合:

```bash
npm run analytics:search-console -- --output docs/search-console-reports/2026-07.md
```

## 出力

`docs/search-console-reports/YYYY-MM-DD.md` に以下を出力する。

- Summary
- Improvement Notes
- Daily Trend
- Top Queries
- Low CTR Queries
- Top Pages
- Low CTR Pages

## 注意

Search Console API のデータは Search Console UI と完全一致しない場合がある。APIは上位行ベースで、直近データも変動する可能性がある。

このレポートは厳密なA/Bテストではなく、次に直すページや導線を決めるための材料として使う。
