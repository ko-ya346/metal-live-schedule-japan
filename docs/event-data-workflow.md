# イベントデータ更新フロー

このアプリは当面、手動メンテナンスで運用します。公開されるイベントデータは `src/data/events.ts` に置きます。

収集したが未公開の情報は `src/data/candidate_events.ts` に置きます。候補イベントは公開ページには表示されません。人間が確認したものだけ `src/data/events.ts` に移します。

## 探す情報源

最終確認には、公式情報またはチケット販売ページを使います。

- アーティスト公式サイト: live、tour、schedule、news ページ
- プロモーター: Creativeman、UDO、SMASH、Hayashi International Promotions、Evoken de Valhall Production、SWD Japan、東京音協、Ward Records
- チケット販売: eplus、チケットぴあ、ローチケ、楽天チケット、TicketDive、LivePocket
- 会場スケジュール: Club Citta、Zepp、Club Quattro、渋谷・大阪のライブハウス
- プロモーター/アーティスト公式X: 来日公演や小規模公演はX先行で出ることがあるため、毎回手動確認する
- 発見用のみ: メタルニュースサイト、SNS投稿、ファンカレンダー

発見用の情報源だけを最終ソースにしないでください。イベントを公開データに追加する前に、アーティスト、プロモーター、会場、チケット販売ページのいずれかで確認します。

毎回確認する優先アーティスト、主要プロモーター/チケットサイト、手動確認するX検索は `src/data/watchTargets.ts` にまとめます。候補収集スクリプトはこのリストを使うため、優先対象を変える場合はここだけを更新してください。

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

## ツアー日程の取りこぼし防止

候補がツアーや複数日程公演に見える場合は、見つけた1件だけで止めず、同じツアーの他日程を確認します。

確認対象の例:

- `Japan Tour`、`Tour`、全国ツアー、ワンマンツアー、追加公演などの表記
- 東京、名古屋、大阪、福岡など複数都市が並ぶ告知
- 同じツアー名で複数のチケット販売ページが存在する公演
- eplus、ぴあ、ローチケなどで同一アーティスト/同一ツアーの別日程が出ている公演
- プロモーターやアーティスト公式の tour / live / schedule ページにまとまっている公演

ツアー系候補を追加するときは、`reviewNotes` に確認範囲を書きます。

- 全日程を確認できた場合: `公式ツアーページとチケットページで全日程確認済み。`
- まだ不確かな場合: `他日程の有無は未確認。公式ツアーページを追加確認したい。`

日程、会場、都道府県が明確に確認できたものは、1公演ごとに候補を作ります。日程が曖昧なものは推測せず、重要な告知だけ `date: null` で残して `reviewNotes` に不足情報を書きます。

Search Console のイベント構造化データ警告を減らすため、候補収集時に見つかった場合は以下も拾います。見つからない場合は null または未指定で構いません。価格は推測しないでください。

- `endDate`: 複数日イベントの終了日
- `imageUrl`: 公式ページやチケットページのイベント画像、OG画像
- `organizerName` / `organizerUrl`: 主催者、招聘元、会場、公式運営元
- `ticketLinks[].price`: 実際に表示されている税込/手数料込みに近いチケット価格。無料でない限り 0 は入れない
- `ticketLinks[].saleStartsAt`: チケット販売開始日
- `ticketLinks[].saleStatus`: `on_sale`、`presale`、`sold_out`、`not_started`、`unknown`
- `ticketLinks[].saleEndsAt`: 販売終了日が明記されている場合

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
    endDate: null,
    prefecture: null,
    venue: null,
    genres: ["Heavy Metal"],
    ticketUrl: null,
    ticketLinks: undefined,
    imageUrl: null,
    organizerName: null,
    organizerUrl: null,
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

GitHub Actions は火木土の09:00 JSTに調査リンクを集め、LLM で候補イベントに変換し、`src/data/candidate_events.ts` に `review_needed` で追加します。候補の確認は `/admin/candidates` で行います。

頻度を上げすぎず、毎回同じ回遊サイト、公式入口、チケット検索、優先アーティストページを定点観測します。巡回頻度よりも、見る入口を固定して差分に気づきやすくすることを優先します。

- 調査メモ: `npm run research:links`
- 候補生成: `npm run research:candidates`
- 候補確認: `/admin/candidates`
- 候補保存先: `src/data/candidate_events.ts`
- 公開データには自動反映しない
- 候補データには自動反映する
- 新規候補が追加されると、GitHub Actions が候補PRを作る（mainには直接コミットしない）
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

候補生成は通常、低トークンの compact モードで動きます。各ページの本文全文ではなく、日付、会場、出演、チケット、価格、優先アーティスト周辺の短い抜粋だけをLLMに渡します。

```bash
npm run research:candidates -- --input=research-links.md --report=candidate-report.md --write
```

トークン量だけ確認したい場合は、LLM呼び出しをスキップできます。

```bash
npm run research:candidates -- --input=research-links.md --report=candidate-report.md --prompt-only
```

どうしてもページ本文を長めに見たい場合だけ full モードを使います。

```bash
npm run research:candidates -- --input=research-links.md --report=candidate-report.md --prompt-mode=full
```

主な調整オプション:

- `--body-chars=450`: compactで抜粋が作れない場合の本文フォールバック文字数
- `--max-snippets=6`: 1ページあたりの抜粋数
- `--snippet-chars=180`: 1抜粋あたりの文字数
- `--known-limit=16`: プロンプトに入れる既存イベント/候補の件数
- `--max-total-pages=24`: 取得してLLMに渡す最大ページ数

SNS 由来や未確認情報は信頼度を低くして、あくまでレビュー対象にします。

将来はこの仕組みをそのまま使って、Search Console のクエリ分析や SEO 改善提案を足せます。収集、候補、レビュー、反映を分けてあるので、出力先だけ増やせば拡張しやすい形です。

## 公開済みイベントの更新フロー

新規候補と公開済みイベントの更新は、別のキューとして扱います。

- 新規候補: `src/data/candidate_events.ts`
- 更新候補: `src/data/event_update_candidates.ts`
- 更新候補の確認: `/admin/candidates`

`/admin/candidates` では、画面上部で新規候補と更新候補を切り替えて確認します。更新候補は、公開済みイベントを直接書き換えません。人間が確認し、必要なものだけ `applied` にして `src/data/events.ts` へ反映します。対象外や信頼できない更新は `ignored` にします。

更新候補は「1つの情報更新 = 1データ」を基本にします。ただし、同じ情報源にまとまっていて同時に判断したい項目は1件にまとめて構いません。

- 基本的に分ける: 出演者追加、日程変更、会場変更、中止/延期
- まとめてもよい: チケットURL、価格、販売状況、開場/開演時刻など同じチケット詳細に含まれる情報

更新候補で主に見る項目:

- 出演者追加、出演者変更
- チケットURL、販売元、価格、販売状況
- 開場/開演時刻
- 会場変更
- 日程変更
- 中止/延期
- 公式URL、主催者URL、画像URL

更新確認の頻度は、新規候補生成より低めにします。今の段階では情報精度を詰めすぎるより、新規ライブの取りこぼしを減らすことを優先します。

- 通常: 週1回、直近3か月の公開イベントを中心に確認
- ライブが近いもの: 開催2週間前から、チケット/公式情報だけ軽く確認
- 重要な来日公演や大型フェス: 新規候補生成時に見つけた更新だけ随時候補化
- 中止、延期、会場変更など重要変更: 見つけたらすぐ更新候補に追加

更新候補もレビュー必須です。自動収集や LLM が見つけた変更を、公開データへ自動適用しないでください。

## 確認用ページ

候補イベントは `/admin/candidates` でも確認できます。

- 候補イベント一覧を見る
- 元URL、公式URL、チケットURLを開く
- 公開済みイベントと見比べる
- 公開イベント用のJSONを確認する
- `copy as event` で公開イベント用データをコピーする

本番の管理ページは閲覧用です。ローカル開発では保存できます。以下の専用コマンドで起動すると、確認結果を候補PRへ自動保存します。

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
    endDate: null,
    prefecture: "東京都",
    venue: "会場名",
    genres: ["Heavy Metal"],
    ticketUrl: null,
    ticketLinks: undefined,
    imageUrl: null,
    organizerName: null,
    organizerUrl: null,
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

## 確認結果を同じPRへ自動保存する

実装PRのマージ後、最新のmainを取得したローカル環境で実行します。Node.js 24以上、Git、認証済みのGitHub CLI (`gh`)、このリポジトリへのpush権限が必要です。UbuntuのIssue投稿専用トークンは使用しません。

```bash
git pull --ff-only
npm run candidates:review -- 84
```

`84` は確認する候補PR番号に置き換えます。作業中の別ブランチがある場合は、クリーンなmainのチェックアウトから起動してください。

1. 専用worktreeを `~/.local/share/metals-calendar/reviews/pr-84` に用意します。元の開発作業場所は切り替えません。
2. 最新mainを候補PRへマージし、データ検証・文言チェック・ビルド後にpushします。競合時は中止し、上書きしません。
3. `http://127.0.0.1:3001/admin/candidates` を開きます。
4. 従来どおり候補を確認して「保存」「採用（マージ後に公開）」「無視」を選びます。更新候補は「適用」を選びます。
5. 操作ごとに検証し、候補・更新候補・公開データの変更をまとめてコミットして同じPRへ送ります。成功後は画面が更新されます。他のカードの未保存入力は残らないため、1件ずつ保存してください。
6. 「PRへ保存済み」の表示後、PRの差分と最新コミットのチェックを確認し、人間がマージします。Vercelの本番デプロイが成功すると公開されます。最後に手動commit/pushする作業は不要です。

通常の `npm run dev` は従来どおりファイル保存のみです。本番では書き込みもGit操作も無効です。専用環境の公開イベント管理は読み取り専用で、編集には候補確認画面を使います。ブラウザのJavaScriptを有効にしてください。

自動収集は確認待ちの `automated-candidates*` PRがある間は待機します。新しい収集はmainから別ブランチを作り、force-pushやレビュー中ブランチのrebaseを行いません。自動収集側でもデータ・文言・ビルドを検証します（GitHub Actionsのトークンで作るPRはPR作成イベントによるCIが起動しないため）。手元のGit認証によるレビューpushでPRのCIが実行されます。マージ前に最新コミットのValidate成功を必ず確認してください。

### 通信失敗と競合

- PRへ送れなかった確認結果はローカルのコミットに保持します。画面の「PRへ再送」で同じコミットを送り直します。再起動しても状態は残り、二重追加しません。
- 画面の状態確認自体が失敗した場合は再読み込みしてください。
- 送信待ちの間は次の操作を止めます。「保存済み」は送信先のコミットを確認できた場合だけ表示します。
- 他の場所でPRが更新された場合は上書きせず停止します。送信待ちがなければ起動コマンドをやり直して最新データを再確認します。分岐した場合は人間/担当エージェントが差分を確認して競合を解消します。force-pushしないでください。
- 対象外の変更・ステージ済みファイル・main上での実行・別リポジトリのPR・マージ済みPRを検出すると停止します。

### プロセスが強制終了した場合

まずレビューサーバーを停止し、専用worktreeへ移動します。通常の通信エラーでは以下の復旧操作は不要です。

```bash
cd ~/.local/share/metals-calendar/reviews/pr-84
```

保存途中のロックが残っている場合は、保存処理が動いていないことを確認してから、空のロックディレクトリだけを削除します。

```bash
rmdir "$(git rev-parse --absolute-git-dir)/candidate-review.lock"
```

コミット前に止まった書き込みは次のコマンドで操作前のデータへ戻し、候補確認をやり直します。コミット後/HEAD変更後の自動巻き戻しは拒否します。その場合は担当エージェントに差分と `.git` 内の `candidate-review-pending.json` の状態確認を依頼してください。

```bash
npm run candidates:review -- --recover
```

レビュー専用worktreeを削除する前に、未送信の結果がないことを確認してください。

実装の検証:

```bash
npm run check:candidate-review
npm run data:validate
npm run copy:check
npm run build
```
