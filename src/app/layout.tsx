import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import styles from "./page.module.css";
import { siteDescription, siteName, siteTitle, siteUrl } from "./site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  applicationName: siteName,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/images/favicon-20260513.png", type: "image/png" }],
    shortcut: [{ url: "/images/favicon-20260513.png", type: "image/png" }],
    apple: [{ url: "/images/favicon-20260513.png", type: "image/png" }],
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: "/",
    type: "website",
    locale: "ja_JP",
    siteName,
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  alternateName: [
    "Metal Live Schedule",
    "Metal Live Schedule Japan",
    "日本のメタルライブ・来日公演カレンダー",
  ],
  url: siteUrl,
  description: siteDescription,
  inLanguage: "ja",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData),
          }}
        />
        {children}
        <Analytics />
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
