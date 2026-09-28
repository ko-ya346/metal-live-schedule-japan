import type { Metadata } from "next";
import Link from "next/link";
import type { CandidateEventStatus } from "../../../data/candidates";
import { candidateEvents } from "../../../data/candidates";
import { eventUpdateCandidates } from "../../../data/event_update_candidates";
import { publishedEvents } from "../../../data/events";
import adminStyles from "../../admin.module.css";
import styles from "../../page.module.css";
import { UpdatesReview } from "../updates/UpdatesReview";
import { CandidatesReview } from "./CandidatesReview";

export const metadata: Metadata = {
  title: "候補確認 | Metal Live Schedule",
  description: "新規候補と公開済みイベント更新候補を確認する管理用ページです。",
  robots: {
    index: false,
    follow: false,
  },
};

type AdminCandidatesPageProps = {
  searchParams?: Promise<{
    adminMessage?: string;
    status?: string;
  }>;
};

function isCandidateEventStatus(value: unknown): value is CandidateEventStatus {
  return value === "review_needed" || value === "published" || value === "ignored";
}

export default async function AdminCandidatesPage({
  searchParams,
}: AdminCandidatesPageProps) {
  const resolvedSearchParams = await searchParams;
  const adminMessage = resolvedSearchParams?.adminMessage;
  const requestedStatus = resolvedSearchParams?.status;
  const selectedStatus = isCandidateEventStatus(requestedStatus)
    ? requestedStatus
    : "review_needed";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Admin</p>
        <h1>候補確認</h1>
        <p className={styles.summary}>
          新規イベント候補と公開済みイベントの更新候補を、同じページで確認します。
        </p>
      </header>

      <section className={adminStyles.adminCopyQueue}>
        <div className={adminStyles.adminLinkRow}>
          <Link className={styles.secondaryLink} href="/admin/events">
            公開イベント管理へ
          </Link>
          <Link className={styles.secondaryLink} href="/">
            公開ページへ
          </Link>
        </div>
      </section>

      <CandidatesReview
        candidates={candidateEvents}
        initialStatusMessage={adminMessage}
        publishedEvents={publishedEvents}
        selectedStatus={selectedStatus}
      />

      <UpdatesReview
        events={publishedEvents}
        updateCandidates={eventUpdateCandidates}
      />
    </main>
  );
}
