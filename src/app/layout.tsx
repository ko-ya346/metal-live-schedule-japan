import type { Metadata, Viewport } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Metal Live Schedule | 日本のヘヴィメタルライブ予定",
  description:
    "日本国内のヘヴィメタルライブ予定を日付順に確認できるイベントカレンダーです。都道府県とジャンルで絞り込みできます。",
  icons: {
    icon: [{ url: "/images/favicon.png", type: "image/png" }],
    apple: [{ url: "/images/favicon.png", type: "image/png" }],
  },
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
      <body className={styles.siteBody}>
        {children}
        <footer className={styles.siteFooter}>
          <nav className={styles.footerNav} aria-label="フッターナビゲーション">
            <Link href="/">イベント一覧</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <p className={styles.footerDisclaimer}>
            公演日程・会場・チケット情報は変更される場合があります。来場前に必ず公式サイトや主催者の情報をご確認ください。
          </p>
        </footer>
      </body>
    </html>
  );
}
