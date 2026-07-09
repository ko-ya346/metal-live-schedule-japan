import type { Metadata } from "next";
import Link from "next/link";
import { xProfileUrl, xReportUrl } from "../../utils/contact";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description:
    "Metals Calendar への連絡先です。掲載情報の修正、情報提供、ご要望、ご意見はこちらからお願いします。",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "お問い合わせ | Metals Calendar",
    description:
      "掲載情報の修正、ライブ情報の提供、ご要望、ご意見はこちらからお願いします。",
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
          掲載情報の修正、ライブ情報の提供、ご要望、ご意見を受け付けています。
        </p>
      </header>

      <div className={styles.infoContent}>
        <section className={styles.infoSection}>
          <h2>連絡先</h2>
          <p>
            連絡は X からお願いします。掲載漏れや変更情報、ご要望、ご意見があれば気軽に連絡してください。
          </p>
          <a
            className={styles.primaryLink}
            href={xProfileUrl}
            target="_blank"
            rel="noreferrer"
          >
            X で連絡する
          </a>
          <a
            className={styles.secondaryLink}
            href={xReportUrl}
            target="_blank"
            rel="noreferrer"
          >
            掲載漏れ・修正を連絡する
          </a>
        </section>
      </div>

      <Link className={styles.textLink} href="/">
        イベント一覧へ戻る
      </Link>
    </main>
  );
}
