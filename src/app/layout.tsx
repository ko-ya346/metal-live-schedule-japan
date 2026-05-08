import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Metal Live Schedule | 日本のヘヴィメタルライブ予定",
  description:
    "日本国内のヘヴィメタルライブ予定を日付順に確認できるイベントカレンダーです。都道府県とジャンルで絞り込みできます。",
  openGraph: {
    title: "Metal Live Schedule | 日本のヘヴィメタルライブ予定",
    description:
      "日本国内のヘヴィメタルライブ予定を日付順に確認できるイベントカレンダーです。",
    type: "website",
    locale: "ja_JP",
    siteName: "Metal Live Schedule",
  },
  twitter: {
    card: "summary",
    title: "Metal Live Schedule | 日本のヘヴィメタルライブ予定",
    description:
      "日本国内のヘヴィメタルライブ予定を日付順に確認できるイベントカレンダーです。",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
