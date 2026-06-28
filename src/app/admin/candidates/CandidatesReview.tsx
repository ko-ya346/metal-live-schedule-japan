import Link from "next/link";
import type { CandidateEvent, CandidateEventStatus } from "../../../data/candidates";
import type { Event } from "../../../data/events";
import { formatEventDate } from "../../../utils/date";
import styles from "../../page.module.css";

type CandidatesReviewProps = {
  candidates: CandidateEvent[];
  publishedEvents: Event[];
  selectedStatus: CandidateEventStatus;
  initialStatusMessage?: string | null;
};

const statusLabels: Record<CandidateEventStatus, string> = {
  review_needed: "要確認",
  published: "公開済み",
  ignored: "対象外",
};

const reviewStatuses: CandidateEventStatus[] = [
  "review_needed",
  "published",
  "ignored",
];

function formatCandidateDate(date: CandidateEvent["date"]) {
  return date ? formatEventDate(date as Event["date"]) : "日付未定";
}

function findRelatedPublishedEvents(candidate: CandidateEvent, events: Event[]) {
  return events
    .filter((event) => {
      const hasSameDate = candidate.date !== null && event.date === candidate.date;
      const hasSameArtist = event.artists.some((artist) =>
        candidate.artists.includes(artist),
      );

      return hasSameDate || hasSameArtist;
    })
    .slice(0, 5);
}

function listToText(values: string[]) {
  return values.join("\n");
}

function getMissingPublishFields(candidate: CandidateEvent) {
  const missingFields: string[] = [];

  if (!candidate.date) {
    missingFields.push("日付");
  }

  if (!candidate.prefecture) {
    missingFields.push("都道府県");
  }

  if (!candidate.venue) {
    missingFields.push("会場");
  }

  return missingFields;
}

export function CandidatesReview({
  candidates,
  publishedEvents,
  selectedStatus,
  initialStatusMessage = null,
}: CandidatesReviewProps) {
  const filteredCandidates = candidates.filter(
    (candidate) => candidate.reviewStatus === selectedStatus,
  );

  return (
    <>
      <div className={styles.adminToolbar}>
        {reviewStatuses.map((status) => (
          <Link
            className={`${styles.adminStatusButton} ${
              selectedStatus === status ? styles.activeAdminStatusButton : ""
            }`}
            href={`/admin/candidates?status=${status}`}
            key={status}
          >
            {statusLabels[status]} (
            {candidates.filter((candidate) => candidate.reviewStatus === status).length}
            )
          </Link>
        ))}
      </div>

      <section className={styles.adminCopyQueue}>
        <div className={styles.adminCandidateHeader}>
          <div>
            <h2>ローカル管理</h2>
            <p className={styles.summary}>
              この画面の編集、ignore、公開はローカル開発サーバー上のデータファイルへ保存します。
            </p>
          </div>
        </div>
        <p className={styles.adminMutedText}>
          本番環境では書き込みを無効にしています。操作後は `npm run build` で確認してください。
        </p>
        {initialStatusMessage && (
          <p className={styles.adminInlineStatus} role="status">
            {initialStatusMessage}
          </p>
        )}
      </section>

      <div className={styles.adminCandidateList}>
        {filteredCandidates.map((candidate) => {
          const relatedEvents = findRelatedPublishedEvents(candidate, publishedEvents);
          const isPublished = candidate.reviewStatus === "published";
          const isIgnored = candidate.reviewStatus === "ignored";
          const missingPublishFields = getMissingPublishFields(candidate);
          const canPublish = !isPublished && missingPublishFields.length === 0;
          const publishButtonLabel = isIgnored ? "公開に戻す" : "公開する";

          return (
            <article className={styles.adminCandidateCard} key={candidate.id}>
              <form action="/api/admin/candidates" method="post">
                <input name="candidateId" type="hidden" value={candidate.id} />

                <div className={styles.adminCandidateHeader}>
                  <div>
                    <p className={styles.kicker}>
                      {statusLabels[candidate.reviewStatus]}
                    </p>
                    <h2>{candidate.artists.join(" / ")}</h2>
                    <p className={styles.adminCandidateId}>
                      ID: <code>{candidate.id}</code>
                    </p>
                    <p className={styles.summary}>
                      {formatCandidateDate(candidate.date)} /{" "}
                      {[candidate.prefecture, candidate.venue]
                        .filter(Boolean)
                        .join(" / ") || "会場未定"}
                    </p>
                  </div>
                </div>

                <div className={styles.adminEditGrid}>
                  <label>
                    アーティスト
                    <textarea
                      defaultValue={listToText(candidate.artists)}
                      name="artists"
                    />
                  </label>
                  <label>
                    ツアー/イベント名
                    <input
                      defaultValue={candidate.tourName ?? ""}
                      name="tourName"
                    />
                  </label>
                  <label>
                    日付
                    <input
                      defaultValue={candidate.date ?? ""}
                      name="date"
                      placeholder="YYYY-MM-DD"
                    />
                  </label>
                  <label>
                    都道府県
                    <input
                      defaultValue={candidate.prefecture ?? ""}
                      name="prefecture"
                    />
                  </label>
                  <label>
                    会場
                    <input defaultValue={candidate.venue ?? ""} name="venue" />
                  </label>
                  <label>
                    ジャンル
                    <textarea defaultValue={listToText(candidate.genres)} name="genres" />
                  </label>
                  <label className={styles.adminCheckboxField}>
                    <input
                      defaultChecked={candidate.isInternational}
                      name="isInternational"
                      type="checkbox"
                    />
                    来日公演
                  </label>
                  <label>
                    チケットURL
                    <input
                      defaultValue={candidate.ticketUrl ?? ""}
                      name="ticketUrl"
                    />
                  </label>
                  <label>
                    公式URL
                    <input
                      defaultValue={candidate.officialUrl ?? ""}
                      name="officialUrl"
                    />
                  </label>
                  <label>
                    メモ
                    <textarea
                      defaultValue={candidate.reviewNotes}
                      name="reviewNotes"
                    />
                  </label>
                </div>

                <dl className={styles.adminCandidateMeta}>
                  <div>
                    <dt>情報源</dt>
                    <dd>{candidate.sourceName}</dd>
                  </div>
                  <div>
                    <dt>信頼度</dt>
                    <dd>{candidate.confidence}</dd>
                  </div>
                </dl>

                <div className={styles.adminLinkRow}>
                  <button
                    className={styles.secondaryLink}
                    name="action"
                    type="submit"
                    value="save"
                  >
                    保存
                  </button>
                  <button
                    className={styles.secondaryLink}
                    disabled={isIgnored}
                    name="action"
                    type="submit"
                    value="ignore"
                  >
                    ignore
                  </button>
                  <button
                    className={styles.primaryLink}
                    disabled={!canPublish}
                    name="action"
                    type="submit"
                    value="publish"
                    title={
                      missingPublishFields.length > 0
                        ? `公開には ${missingPublishFields.join("、")} が必要です`
                        : undefined
                    }
                  >
                    {publishButtonLabel}
                  </button>
                  <a
                    className={styles.secondaryLink}
                    href={candidate.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    元URLを開く
                  </a>
                  {candidate.officialUrl && (
                    <a
                      className={styles.secondaryLink}
                      href={candidate.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      公式URL
                    </a>
                  )}
                  {candidate.ticketUrl && (
                    <a
                      className={styles.secondaryLink}
                      href={candidate.ticketUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      チケットURL
                    </a>
                  )}
                </div>
                {missingPublishFields.length > 0 && (
                  <p className={styles.adminFieldWarning} role="status">
                    公開には {missingPublishFields.join(" / ")} が必要です。先に保存して埋めてください。
                  </p>
                )}
              </form>

              <section className={styles.adminCompareSection}>
                <h3>近い公開済みイベント</h3>
                {relatedEvents.length === 0 ? (
                  <p>該当しそうな公開済みイベントはありません。</p>
                ) : (
                  <ul>
                    {relatedEvents.map((event) => (
                      <li key={event.id}>
                        {event.date} / {event.artists.join(" / ")} / {event.venue}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </article>
          );
        })}
      </div>
    </>
  );
}
