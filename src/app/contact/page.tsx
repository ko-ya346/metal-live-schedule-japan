import type { Metadata } from "next";
import Link from "next/link";
import styles from "../page.module.css";

const xProfileUrl = "https://x.com/ko_ya346";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description:
    "Metal Live Schedule への連絡先です。掲載情報の修正依頼、情報提供、ご要望、ご意見はこちらからお願いします。",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "お問い合わせ | Metal Live Schedule",
    description:
      "掲載情報の修正依頼、公式情報にもとづくライブ情報の提供、ご要望、ご意見はこちらからお願いします。",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Contact</p>
        <h1>お問い合わせ</h1>
        <p className={styles.summary}>
          掲載情報の修正依頼、公式情報にもとづくライブ情報の提供、ご要望、ご意見を受け付けています。
        </p>
      </header>

      <div className={styles.infoContent}>
        <section className={styles.infoSection}>
          <h2>連絡先</h2>
          <p>
            連絡は X からお願いします。掲載情報について連絡する場合は、アーティスト名、公演日、会場名、確認できる公式URLを添えてもらえると確認しやすいです。
          </p>
          <a
            className={styles.primaryLink}
            href={xProfileUrl}
            target="_blank"
            rel="noreferrer"
          >
            X で連絡する
          </a>
        </section>
      </div>

      <Link className={styles.textLink} href="/">
        イベント一覧へ戻る
      </Link>
    </main>
  );
}
