# metal-live-schedule
Japan metal live events calndar with filters

# 要件
- カレンダーで見る
- 地域/ジャンルで絞り込み可能
- チケットURL に飛べる

# イベント型
- id
- artist
- tourName
- date
- prefecture
- venue # 会場
- genres
- ticketUrl
- officialUrl
- status

# 参考サイト
[heavy-metal-tour](https://heavy-metal-tour.com/live)  
[eplus](https://eplus.jp/sf/live/metal-core)  
[metal100](https://metal100.com/tourdate/)

# ローカル管理画面

候補イベントはローカル開発サーバーで `/admin/candidates` を開くと確認できます。

- 候補の出演者、日付、会場、URL、メモをブラウザで編集できます。
- `保存` は `src/data/candidate_events.ts` を更新します。
- `ignore` は候補を `reviewStatus: "ignored"` にします。
- `公開する` は `src/data/events.ts` にイベントを追加し、候補を `published` にします。
- 本番環境では認証なしのファイル書き込みを避けるため、管理APIの書き込みは無効です。

操作後は以下を確認します。

```bash
npm run data:validate
npm run build
```


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
