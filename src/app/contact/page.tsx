import type { Metadata } from "next";
import Link from "next/link";
import styles from "../page.module.css";

const xProfileUrl = "https://x.com/ko_ya346";

export const metadata: Metadata = {
  title: "Contact | Metal Live Schedule",
  description:
    "Metal Live Schedule への連絡先です。掲載情報の修正依頼や情報提供はこちらからお願いします。",
};

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Contact</p>
        <h1>お問い合わせ</h1>
        <p className={styles.summary}>
          掲載情報の修正依頼や、公式情報にもとづくライブ情報の提供はこちらからお願いします。
        </p>
      </header>

      <div className={styles.infoContent}>
        <section className={styles.infoSection}>
          <h2>連絡先</h2>
          <p>
            現時点ではバックエンドの問い合わせフォームは用意せず、X のプロフィールへのリンクだけを置いています。
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

        <section className={styles.infoSection}>
          <h2>送るときの目安</h2>
          <p>
            アーティスト名、公演日、会場名、確認できる公式URLを添えてもらえると確認しやすいです。
          </p>
        </section>
      </div>

      <Link className={styles.textLink} href="/">
        イベント一覧へ戻る
      </Link>
    </main>
  );
}
