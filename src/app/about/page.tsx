import type { Metadata } from "next";
import Link from "next/link";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "About | Metal Live Schedule",
  description:
    "Metal Live Schedule は、日本国内のヘヴィメタルライブ情報を手動で整理する小さなイベントカレンダーです。",
};

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>About</p>
        <h1>このサイトについて</h1>
        <p className={styles.summary}>
          Metal Live Schedule は、日本国内のヘヴィメタルライブ情報を見つけやすくするための小さなイベントカレンダーです。
        </p>
      </header>

      <div className={styles.infoContent}>
        <section className={styles.infoSection}>
          <h2>目的</h2>
          <p>
            公式バンドサイト、公式イベントページ、プロモーターのページを確認しながら、ライブ日程を手動で整理しています。
          </p>
        </section>

        <section className={styles.infoSection}>
          <h2>掲載方針</h2>
          <p>
            まずはシンプルに、日付・地域・ジャンルで探せることを優先しています。情報は確認できた範囲で掲載します。
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
