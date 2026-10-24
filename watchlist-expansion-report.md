# 収集範囲の更新候補 (2026-10-24)

## open-weightモデルの出力

- 使用モデル: `metals-review:8b`
- 実測プロンプトトークン数: 3,438
- 生成トークン数: 262
- モデル処理時間: 124秒
- 対象: 489件の公開イベント（前365日〜先180日）。アーティストの共演、会場、地域、主催者を入力。
- 未登録アーティスト候補: 496組。モデルには共演回数上位32組を渡し、各候補のイベント例を1件に圧縮。
- イベントIDと出演名の照合を通過した追加候補: 2組。

### Rivers Of Nihil

- open-weight理由（原文）: `Co-performed with metalcore acts`
- 根拠イベントID: `extreme-ritual-2026-osaka`
- 記録上の出演: Psycroptic、The Zenith Passage

### Psycroptic

- open-weight理由（原文）: `Co-performed with metalcore acts`
- 根拠イベントID: `extreme-ritual-2026-osaka`
- 記録上の出演: Rivers Of Nihil、The Zenith Passage

## Codexによる独立確認

- イベントIDと2組の出演は公開イベントデータと一致。
- 同じイベントのジャンル記録は `Technical Death Metal` と `Progressive Death Metal`。モデル理由の「metalcore」はデータで裏付けられていないため、理由の分類は採用せず、共演関係だけを確認済みとして扱う。
- 両バンドの公式サイトにツアー日程があることを確認したため、この初回PRでは探索キーワードに加えて公式情報源も追加。
  - Rivers Of Nihil: https://riversofnihil.com/
  - Psycroptic: https://www.psycroptic.com/
- 根拠イベントは2026-08-24開催分で、将来の日本公演を示すものではない。今回追加するのは今後の探索語と監視元のみ。

## 人間に確認してほしいこと

- 2組をMetal Calendarの探索対象に含めるか確認してください。
- 公式サイトの監視元と、モデルのジャンル理由が不正確だった点を確認してください。
- 過去イベントの再公開・新規公開は行いません。
