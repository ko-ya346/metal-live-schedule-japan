# Metals Calendar

日本国内のメタルライブ、来日公演、ラウドロック、メタルコア、ハードコアのライブ予定を探しやすくするための小さなイベントカレンダーです。

## 目的

- ライブ情報を起点に、日本でメタル／ヘヴィ系音楽に触れる機会を増やす
- 来日アーティストを中心に、国内バンドのライブも見つけやすくする
- 日付、地域、ジャンルでライブ情報を探せるようにする
- 手作業で確認しながら、公開前の候補イベントを管理しやすくする

プロダクトの長期方針は [`docs/ROADMAP.md`](docs/ROADMAP.md) にまとめています。
実装マイルストーンは [`docs/project-roadmap.md`](docs/project-roadmap.md) にまとめています。
LLM向けの短い作業コンテキストは [`llms.txt`](llms.txt) と [`docs/llm-wiki/index.md`](docs/llm-wiki/index.md) にあります。

## 主な機能

- 月間カレンダー表示
- イベント一覧
- 日付順ソート
- 地域/ジャンル/期間/キーワードでの絞り込み
- イベント詳細ページ
- 候補イベント確認用のローカル管理画面
- GitHub Actions による候補イベント自動追加

## イベントデータ

公開イベントは `src/data/events.ts` で管理します。

主な項目:

- `id`
- `artists`
- `tourName`
- `date`
- `prefecture`
- `venue`
- `genres`
- `ticketUrl`
- `officialUrl`
- `status`
- `publishedAt`
- `updatedAt`

候補イベントは `src/data/candidate_events.ts` に置き、確認後に公開イベントへ移します。

## ローカル管理画面

開発サーバーで `/admin/candidates` を開くと、新規イベント候補と公開済みイベントの更新候補を確認できます。

- 画面上部で `新規候補の要確認` と `更新候補の要確認` を切り替えます。
- 候補の出演者、日付、会場、URL、メモをブラウザで編集できます。
- `保存` は `src/data/candidate_events.ts` を更新します。
- `ignore` は候補を `reviewStatus: "ignored"` にします。
- `公開する` は `src/data/events.ts` にイベントを追加し、候補を `published` にします。
- 公開済みイベントの更新候補は `/admin/candidates` で確認し、適用するまで `src/data/events.ts` には反映しません。
- 本番環境では認証なしのファイル書き込みを避けるため、管理APIの書き込みは無効です。

## 自動収集

GitHub Actions は定期実行で Web 調査を行い、候補イベントだけを `src/data/candidate_events.ts` に追加します。

- 調査は公式サイト、招聘会社、会場、チケットページを優先します
- SNS は公式アカウントのみを低信頼候補として扱います
- 公開データへは自動反映しません
- 候補の確認は `/admin/candidates` で人間が行います
- 新規候補が追加された場合も、公開ページには表示されません
- 新規候補が追加された回だけ通知用 issue を作ります
- レビュー場所は `/admin/candidates` に統一し、issue は確認が終わったら close します
- 新しい通知 issue を作るとき、古い候補確認 issue は自動で close します

## AIサイトレビュー

GitHub Actions は毎朝、サイト構成・公開イベントデータ・直近の計測レポートを読み、改善候補がある場合だけ通知用 issue を作ります。

- デフォルトではGitHub Actions内でOllamaを起動し、無料のオープンウェイトモデルを使います
- コードや公開データは自動変更しません
- 実装する場合は、人間が issue を確認して別PRで対応します

詳しくは [`docs/site-review-agent.md`](docs/site-review-agent.md) を参照してください。

## ローカル確認

```bash
npm run dev
```

データ編集後は以下を確認します。

```bash
npm run data:validate
npm run build
```

## 参考サイト

- [heavy-metal-tour](https://heavy-metal-tour.com/live)
- [eplus](https://eplus.jp/sf/live/metal-core)
- [metal100](https://metal100.com/tourdate/)
