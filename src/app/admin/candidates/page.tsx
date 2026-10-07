import { reviewPageData } from "../../../server/candidateReview";
import { ReviewSync } from "./ReviewSync";
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
    queue?: string;
    status?: string;
  }>;
};

type ReviewQueue = "new" | "updates";

function isCandidateEventStatus(value: unknown): value is CandidateEventStatus {
  return value === "review_needed" || value === "published" || value === "ignored";
}

function isReviewQueue(value: unknown): value is ReviewQueue {
  return value === "new" || value === "updates";
}

export default async function AdminCandidatesPage({
  searchParams,
}: AdminCandidatesPageProps) {
  const snapshot = await reviewPageData();
  const currentCandidates = snapshot?.data.candidateEvents ?? candidateEvents;
  const currentUpdates = snapshot?.data.eventUpdateCandidates ?? eventUpdateCandidates;
  const currentEvents = snapshot?.data.publishedEvents ?? publishedEvents;
  const resolvedSearchParams = await searchParams;
  const adminMessage = resolvedSearchParams?.adminMessage;
  const requestedQueue = resolvedSearchParams?.queue;
  const requestedStatus = resolvedSearchParams?.status;
  const selectedQueue = isReviewQueue(requestedQueue) ? requestedQueue : "new";
  const selectedStatus = isCandidateEventStatus(requestedStatus)
    ? requestedStatus
    : "review_needed";
  const newReviewNeededCount = currentCandidates.filter(
    (candidate) => candidate.reviewStatus === "review_needed",
  ).length;
  const updateReviewNeededCount = currentUpdates.filter(
    (candidate) => candidate.reviewStatus === "review_needed",
  ).length;

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
          <Link
            className={`${adminStyles.adminStatusButton} ${
              selectedQueue === "new" ? adminStyles.activeAdminStatusButton : ""
            }`}
            href="/admin/candidates?queue=new&status=review_needed"
          >
            新規候補の要確認 ({newReviewNeededCount})
          </Link>
          <Link
            className={`${adminStyles.adminStatusButton} ${
              selectedQueue === "updates" ? adminStyles.activeAdminStatusButton : ""
            }`}
            href="/admin/candidates?queue=updates"
          >
            更新候補の要確認 ({updateReviewNeededCount})
          </Link>
          {!snapshot && (
            <Link className={styles.secondaryLink} href="/admin/events">
              公開イベント管理へ
            </Link>
          )}
          <Link className={styles.secondaryLink} href="/">
            公開ページへ
          </Link>
        </div>
      </section>

      <ReviewSync key={snapshot?.info?.revision} info={snapshot?.info ?? null} initialMessage={adminMessage}>
        {selectedQueue === "new" ? (
          <CandidatesReview
            candidates={currentCandidates}
            initialStatusMessage={snapshot ? null : adminMessage}
            publishedEvents={currentEvents}
            selectedStatus={selectedStatus}
          />
        ) : (
          <UpdatesReview
            events={currentEvents}
            updateCandidates={currentUpdates}
          />
        )}
      </ReviewSync>
    </main>
  );
}
