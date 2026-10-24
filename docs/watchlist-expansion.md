# open-weightモデルによる収集範囲の拡張

週次ジョブは別のDBではなく `src/data/events.ts` の公開イベントを読み、`isInternational=false` の公演から国内バンドの共演候補を作ります。会場、地域、イベントのジャンル、主催者名と主催者URLもモデルの判断材料に含めます。海外アーティストの来日は個別バンドの固定リストではなく、主催者・チケット・会場などの広い情報源から探します。

ローカルの open-weight モデルが最大5組を選び、国内アーティストと判断した根拠も出します。根拠が不確かな場合は候補を出さないよう指示します。スクリプトは候補名と根拠イベントIDが元データに実在する場合だけ `discoveryArtistKeywords` に追加し、入力・出力トークン数とモデルの理由をレポートします。実測入力が7,000トークン以上、または生成上限に達した出力は採用しません。未レビューPRがある間は次回の実行をスキップします。公開イベントは変更せず、PRも自動マージしません。

初回のモデル試行では海外バンドが選ばれたため、監視バンドにも公式情報源にも追加しませんでした。国内候補として再実行し、国内根拠を人間が確認できるレポートをPRに添えます。定期モデルPRは探索語を提案し、公式URLを発明して登録することはありません。主催者・会場・共演関係は候補の根拠としてレポートに残します。

実装PRをマージした後、Ubuntuのcontrol checkoutから最新のインストーラを取得して週次タイマーを登録します。control worktreeを切り替える必要はありません。

```sh
git -C "$HOME/.local/share/metals-calendar/control" fetch origin main
git -C "$HOME/.local/share/metals-calendar/control" show origin/main:ops/ubuntu/install-watchlist-expansion.sh | bash
```

毎週月曜08:00 JSTに起動し、開始時刻には最大20分のばらつきを加えます。手動実行は次のコマンドです。

```sh
ops/ubuntu/run-watchlist-expansion.sh
```

候補が0件でも、モデル結果と実行ログは `state/watchlist-expansion-<日時>.md` と `.log` に保存されます。生成されたPRは通常どおり人間が確認・マージします。
