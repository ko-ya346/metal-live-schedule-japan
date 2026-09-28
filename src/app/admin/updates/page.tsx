import type { Metadata } from "next";
import Link from "next/link";
import { eventUpdateCandidates } from "../../../data/event_update_candidates";
import { publishedEvents } from "../../../data/events";
import adminStyles from "../../admin.module.css";
import styles from "../../page.module.css";
import { UpdatesReview } from "./UpdatesReview";

export const metadata: Metadata = {
  title: "公開イベント更新候補 | Metal Live Schedule",
  description: "公開済みイベントの更新候補を確認する管理用ページです。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminUpdatesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Admin</p>
        <h1>公開イベント更新候補</h1>
        <p className={styles.summary}>
          公開済みイベントの変更候補を確認し、必要なものだけ公開データへ適用します。
        </p>
      </header>

      <section className={adminStyles.adminCopyQueue}>
        <div className={adminStyles.adminLinkRow}>
          <Link className={styles.secondaryLink} href="/admin/candidates">
            候補イベント確認へ
          </Link>
          <Link className={styles.secondaryLink} href="/admin/events">
            公開イベント管理へ
          </Link>
          <Link className={styles.secondaryLink} href="/">
            公開ページへ
          </Link>
        </div>
      </section>

      <UpdatesReview
        events={publishedEvents}
        updateCandidates={eventUpdateCandidates}
      />
    </main>
  );
}
