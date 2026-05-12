"use client";

import { useMemo, useState } from "react";
import type { CandidateEvent, CandidateEventStatus } from "../../../data/candidates";
import type { Event } from "../../../data/events";
import { formatEventDate } from "../../../utils/date";
import styles from "../../page.module.css";

type CandidatesReviewProps = {
  candidates: CandidateEvent[];
  publishedEvents: Event[];
};

const statusLabels: Record<CandidateEventStatus, string> = {
  review_needed: "要確認",
  ignored: "対象外",
};

function formatCandidateDate(date: CandidateEvent["date"]) {
  return date ? formatEventDate(date as Event["date"]) : "日付未定";
}

function formatEventObject(candidate: CandidateEvent) {
  const eventObject = {
    id: candidate.id,
    artists: candidate.artists,
    tourName: candidate.tourName ?? "TOUR NAME",
    date: candidate.date ?? "YYYY-MM-DD",
    prefecture: candidate.prefecture ?? "都道府県",
    venue: candidate.venue ?? "会場名",
    genres: candidate.genres,
    ticketUrl: candidate.ticketUrl,
    officialUrl: candidate.officialUrl,
    status: candidate.eventStatus,
  };

  return JSON.stringify(eventObject, null, 2);
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

export function CandidatesReview({
  candidates,
  publishedEvents,
}: CandidatesReviewProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<CandidateEventStatus>("review_needed");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const filteredCandidates = useMemo(
    () =>
      candidates.filter((candidate) => candidate.reviewStatus === selectedStatus),
    [candidates, selectedStatus],
  );

  async function copyAsEvent(candidate: CandidateEvent) {
    await navigator.clipboard.writeText(formatEventObject(candidate));
    setCopiedId(candidate.id);
  }

  return (
    <>
      <div className={styles.adminToolbar}>
        {(["review_needed", "ignored"] as CandidateEventStatus[]).map((status) => (
          <button
            className={`${styles.adminStatusButton} ${
              selectedStatus === status ? styles.activeAdminStatusButton : ""
            }`}
            key={status}
            type="button"
            onClick={() => setSelectedStatus(status)}
          >
            {statusLabels[status]} (
            {candidates.filter((candidate) => candidate.reviewStatus === status).length}
            )
          </button>
        ))}
      </div>

      <div className={styles.adminCandidateList}>
        {filteredCandidates.map((candidate) => {
          const relatedEvents = findRelatedPublishedEvents(candidate, publishedEvents);
          const eventObject = formatEventObject(candidate);

          return (
            <article className={styles.adminCandidateCard} key={candidate.id}>
              <div className={styles.adminCandidateHeader}>
                <div>
                  <p className={styles.kicker}>{statusLabels[candidate.reviewStatus]}</p>
                  <h2>{candidate.artists.join(" / ")}</h2>
                  <p className={styles.summary}>
                    {formatCandidateDate(candidate.date)} /{" "}
                    {[candidate.prefecture, candidate.venue]
                      .filter(Boolean)
                      .join(" / ") || "会場未定"}
                  </p>
                </div>

                <button
                  className={styles.primaryLink}
                  type="button"
                  onClick={() => copyAsEvent(candidate)}
                >
                  {copiedId === candidate.id ? "Copied" : "copy as event"}
                </button>
              </div>

              <dl className={styles.adminCandidateMeta}>
                <div>
                  <dt>ツアー</dt>
                  <dd>{candidate.tourName ?? "未定"}</dd>
                </div>
                <div>
                  <dt>ジャンル</dt>
                  <dd>{candidate.genres.join(", ")}</dd>
                </div>
                <div>
                  <dt>情報源</dt>
                  <dd>{candidate.sourceName}</dd>
                </div>
                <div>
                  <dt>メモ</dt>
                  <dd>{candidate.notes || "なし"}</dd>
                </div>
              </dl>

              <div className={styles.adminLinkRow}>
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

              <section className={styles.adminJsonSection}>
                <h3>コピー用JSON</h3>
                <pre>{eventObject}</pre>
              </section>
            </article>
          );
        })}
      </div>
    </>
  );
}
