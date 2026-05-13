import type { Metadata } from "next";
import Link from "next/link";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "このサイトについて",
  description:
    "Metal Live Schedule は、日本国内のヘヴィメタルライブ情報を見やすく、検索しやすくするためのサイトです。",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "このサイトについて | Metal Live Schedule",
    description:
      "Metal Live Schedule の目的、掲載方針、利用時の注意事項をまとめています。",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>About</p>
        <h1>このサイトについて</h1>
        <p className={styles.summary}>
          Metal Live Schedule は、日本国内のヘヴィメタルライブ情報を見やすく、検索しやすくするためのサイトです。
        </p>
      </header>

      <div className={styles.infoContent}>
        <section className={styles.infoSection}>
          <h2>目的</h2>
          <p>
            ヘヴィメタルのライブ情報を日付、地域、ジャンルで探しやすくし、気になる公演を見逃しにくくすることを目指しています。
          </p>
        </section>

        <section className={styles.infoSection}>
          <h2>掲載方針</h2>
          <p>
            来日アーティストを中心に、国内バンドのライブもできるだけ網羅的に掲載することを目指します。公式バンドサイト、公式イベントページ、プロモーターのページなどで確認できた情報を優先します。
          </p>
        </section>

        <section className={styles.infoSection}>
          <h2>注意事項</h2>
          <p>
            公演日程、会場、出演者、チケット情報は変更される場合があります。来場前に必ず公式サイトや主催者の情報をご確認ください。
          </p>
        </section>
      </div>

      <Link className={styles.textLink} href="/">
        イベント一覧へ戻る
      </Link>
    </main>
  );
}
