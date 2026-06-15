# イベントデータ更新フロー

このアプリは当面、手動メンテナンスで運用します。公開されるイベントデータは `src/data/events.ts` に置きます。

収集したが未公開の情報は `src/data/candidate_events.ts` に置きます。候補イベントは公開ページには表示されません。人間が確認したものだけ `src/data/events.ts` に移します。

## 探す情報源

最終確認には、公式情報またはチケット販売ページを使います。

- アーティスト公式サイト: live、tour、schedule、news ページ
- プロモーター: Creativeman、UDO、SMASH、Hayashi International Promotions、Evoken de Valhall Production
- チケット販売: eplus、チケットぴあ、ローチケ、楽天チケット
- 会場スケジュール: Club Citta、Zepp、Club Quattro、渋谷・大阪のライブハウス
- 発見用のみ: メタルニュースサイト、SNS投稿、ファンカレンダー

発見用の情報源だけを最終ソースにしないでください。イベントを公開データに追加する前に、アーティスト、プロモーター、会場、チケット販売ページのいずれかで確認します。

## 収集フロー

1. `src/data/crawlTargets.ts` にある情報源を確認する。
2. 気になる公演を `src/data/candidate_events.ts` に追加する。
3. 確認が必要な候補は `reviewStatus: "review_needed"` にする。
4. 公開イベントに移した候補は `reviewStatus: "published"` にする。
5. 対象外、重複、信頼しにくい候補は `reviewStatus: "ignored"` にする。
6. 公開前に公式情報で詳細を確認する。
7. 確認できたイベントだけ `src/data/events.ts` にコピーする。
8. `review_needed` から公開用データにコピーしたら、候補側は `published` に変更して重複確認用に残す。

候補イベントはレビュー用の作業リストです。公開データの参照元にはしません。

## 候補イベントのテンプレート

候補イベントのテンプレートはこのコマンドで出力できます。

```bash
npm run candidates:new
```

```ts
{
    id: "artist-2026-prefecture-or-city",
    artists: ["ARTIST"],
    tourName: null,
    date: null,
    prefecture: null,
    venue: null,
    genres: ["Heavy Metal"],
    ticketUrl: null,
    officialUrl: null,
    sourceUrl: "https://example.com/source",
    sourceType: "manual",
    sourceName: "Source name",
    confidence: "medium",
    eventStatus: "scheduled",
    reviewStatus: "review_needed",
    reviewNotes: "",
    collectedAt: "2026-05-10",
    reviewedAt: null,
},
```

## レビュー用コマンド

```bash
npm run candidates:list
npm run candidates:list -- --status=review_needed
npm run data:validate
```

`npm run data:validate` は、公開イベント、候補イベント、収集対象をチェックします。

## 自動収集とPR

GitHub Actions は定期実行で調査メモを更新します。候補の確認は `/admin/candidates` で行います。

- 調査メモ: `npm run research:links`
- 候補確認: `/admin/candidates`
- 候補保存先: `src/data/candidate_events.ts`
- 公開データには自動反映しない

SNS 由来や未確認情報は信頼度を低くして、あくまでレビュー対象にします。

将来はこの仕組みをそのまま使って、Search Console のクエリ分析や SEO 改善提案を足せます。収集、候補、レビュー、反映を分けてあるので、出力先だけ増やせば拡張しやすい形です。

## 確認用ページ

候補イベントは `/admin/candidates` でも確認できます。

- 候補イベント一覧を見る
- 元URL、公式URL、チケットURLを開く
- 公開済みイベントと見比べる
- 公開イベント用のJSONを確認する
- `copy as event` で公開イベント用データをコピーする

このページは保存機能を持ちません。公開する場合は、コピーした内容を人間が確認して `src/data/events.ts` に貼り付けます。

## イベントを追加する

1. `src/data/events.ts` を開く。
2. 既存のイベントオブジェクトをコピーする。
3. すべての項目を差し替える。
4. `date` は `YYYY-MM-DD` にする。
5. 出演者はすべて `artists` に入れる。
6. ヘッドライナー、またはカレンダー上の主表示にしたいアーティストを `artists` の先頭に置く。
7. 都道府県は `東京都`、`大阪府`、`神奈川県` のような日本語表記にする。
8. チケット情報が未公開の場合は `ticketUrl: null` にする。
9. `officialUrl` には、イベント内容を確認できるアーティスト、会場、主催者ページを入れる。
10. `status` は `scheduled`、`postponed`、`cancelled` のいずれかにする。
11. ローカルチェックを実行する。

```bash
npm run lint
npm run build
```

## 公開イベントのテンプレート

```ts
{
    id: "artist-2026-prefecture-or-city",
    artists: ["HEADLINER", "SUPPORT ACT"],
    tourName: "TOUR NAME",
    date: "2026-01-01",
    prefecture: "東京都",
    venue: "会場名",
    genres: ["Heavy Metal"],
    ticketUrl: null,
    officialUrl: "https://example.com/event",
    status: "scheduled",
},
```

## ID の付け方

安定した小文字のIDにします。アーティスト名、年、場所、または連番を含めます。

- `iron-maiden-2026-kanagawa-1`
- `iron-maiden-2026-kanagawa-2`
- `amorphis-2026-tokyo-1`

## 編集後の確認

画面で以下を確認します。

- イベントが日付順に並んでいる。
- 都道府県フィルターに新しい都道府県が入っている。
- ジャンルフィルターに新しいジャンルが入っている。
- チケットリンクと公式リンクが正しいページを開く。
- スマホ幅で文字やボタンが崩れていない。
