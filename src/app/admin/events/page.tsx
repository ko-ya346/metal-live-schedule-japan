import type { Metadata } from "next";
import Link from "next/link";
import { publishedEvents } from "../../../data/events";
import styles from "../../page.module.css";
import { EventsReview } from "./EventsReview";

export const metadata: Metadata = {
  title: "公開イベント管理 | Metal Live Schedule",
  description: "公開済みイベントを編集・公開取り消しする管理用ページです。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminEventsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Admin</p>
        <h1>公開イベント管理</h1>
        <p className={styles.summary}>
          公開済みイベントを編集し、掲載をやめたいものは公開取り消しにできます。
        </p>
      </header>

      <section className={styles.adminCopyQueue}>
        <div className={styles.adminLinkRow}>
          <Link className={styles.secondaryLink} href="/admin/candidates">
            候補イベント確認へ
          </Link>
          <Link className={styles.secondaryLink} href="/">
            公開ページへ
          </Link>
        </div>
      </section>

      <EventsReview events={publishedEvents} />
    </main>
  );
}
