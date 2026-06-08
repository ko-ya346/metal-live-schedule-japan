import type { Metadata } from "next";
import Link from "next/link";
import type { CandidateEventStatus } from "../../../data/candidates";
import { candidateEvents } from "../../../data/candidates";
import { publishedEvents } from "../../../data/events";
import styles from "../../page.module.css";
import { CandidatesReview } from "./CandidatesReview";

export const metadata: Metadata = {
  title: "候補イベント確認 | Metal Live Schedule",
  description: "公開前の候補イベントを確認する管理用ページです。",
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
  const selectedStatus = isCandidateEventStatus(resolvedSearchParams?.status)
    ? resolvedSearchParams.status
    : "review_needed";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Admin</p>
        <h1>候補イベント確認</h1>
        <p className={styles.summary}>
          候補イベントを確認し、元URLや公開済みイベントと見比べながら、公開用データへコピーします。
        </p>
      </header>

      <section className={styles.adminCopyQueue}>
        <div className={styles.adminLinkRow}>
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
    </main>
  );
}
