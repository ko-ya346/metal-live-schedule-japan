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

## 地域別の収集分担

候補収集は地域別に分けて確認します。すべての候補は `src/data/candidate_events.ts` に集約し、レビューは `/admin/candidates` だけで行います。

- 関東首都圏: 東京、神奈川、埼玉、千葉。件数が多いため、来日公演と小箱のラウド/ハードコアを優先して見る。
- 大阪近辺: 大阪、京都、兵庫、滋賀、奈良、和歌山。`/prefectures/osaka` の検索需要があるため、大阪府は厚めに見る。
- 名古屋・東海: 愛知、岐阜、三重、静岡。eplus愛知、ell.SIZE、3STAR、CLUB UPSET、RAD HALL周辺を見る。
- その他地域: 北海道、東北、北陸、中国、四国、九州。来日ツアーの地方公演と国内バンドの主要ツアーを拾う。
- 全国・来日: 招聘会社、公式バンドサイト、チケット横断ページ。地域別に漏れた公演を拾う。

GitHub Actions の自動調査メモもこの地域区分で出力します。人間またはLLMが候補生成する場合も、この区分ごとに見て重複を避けます。

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

## 自動収集と候補確認

GitHub Actions は定期実行で調査リンクを集め、LLM で候補イベントに変換し、`src/data/candidate_events.ts` に `review_needed` で追加します。候補の確認は `/admin/candidates` で行います。

- 調査メモ: `npm run research:links`
- 候補生成: `npm run research:candidates`
- 候補確認: `/admin/candidates`
- 候補保存先: `src/data/candidate_events.ts`
- 公開データには自動反映しない
- 新規候補が追加されると、GitHub Actions が main にコミットする
- 新規候補が追加された回だけ、日付付きの通知 issue を作る
- レビュー場所は `/admin/candidates` に統一する
- issue は「候補が追加されたので確認する」という通知として扱う
- 新しい通知 issue を作るとき、古い候補確認 issue は自動で close する
- `/admin/candidates` で人間または LLM が確認し、必要な反映が終わったら、最新の通知 issue を close する

スケジュール実行でも、ここで Codex に依頼する通常の候補収集に近づけるため、プロモーター、会場、チケットページ、発見用ニュースページを材料にします。ただし最終判断は自動化しません。ノイズを許容して `review_needed` に置き、人間が公開、修正、ignore を決めます。

発見用ニュースサイトは入口として使いますが、ニュースページに日本公演が載っているだけでメタル/ヘヴィ系候補とは判断しません。アーティスト名、公演名、URL、メモにヘヴィ系の手がかりがない候補は自動候補化から外します。

LLM に候補収集を依頼する場合は、未 close の候補確認 issue も確認対象に含めます。issue の候補を見て、候補データへの追加、既存データとの重複確認、対象外判断が終わったものは LLM が close して構いません。

必要な環境変数:

- `OPENAI_API_KEY`
- 任意: `OPENAI_MODEL`

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
