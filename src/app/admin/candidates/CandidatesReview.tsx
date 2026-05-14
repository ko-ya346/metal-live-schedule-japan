"use client";

import { useEffect, useMemo, useState } from "react";
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
  published: "公開済み",
  ignored: "対象外",
};

const reviewStatuses: CandidateEventStatus[] = [
  "review_needed",
  "published",
  "ignored",
];
const selectedCandidateIdsStorageKey = "metal-live-selected-candidate-ids";
const ignoredCandidateIdsStorageKey = "metal-live-ignored-candidate-ids";

function loadStoredIds(storageKey: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function formatCandidateDate(date: CandidateEvent["date"]) {
  return date ? formatEventDate(date as Event["date"]) : "日付未定";
}

function formatEventObject(candidate: CandidateEvent) {
  return {
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

async function copyText(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function CandidatesReview({
  candidates,
  publishedEvents,
}: CandidatesReviewProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<CandidateEventStatus>("review_needed");
  const [copyCandidateIds, setCopyCandidateIds] = useState<string[]>(() =>
    loadStoredIds(selectedCandidateIdsStorageKey),
  );
  const [ignoredCandidateIds, setIgnoredCandidateIds] = useState<string[]>(() =>
    loadStoredIds(ignoredCandidateIdsStorageKey),
  );
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(
      selectedCandidateIdsStorageKey,
      JSON.stringify(copyCandidateIds),
    );
  }, [copyCandidateIds]);

  useEffect(() => {
    window.localStorage.setItem(
      ignoredCandidateIdsStorageKey,
      JSON.stringify(ignoredCandidateIds),
    );
  }, [ignoredCandidateIds]);

  const filteredCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        const isIgnoredInSession = ignoredCandidateIds.includes(candidate.id);

        if (selectedStatus === "ignored") {
          return candidate.reviewStatus === "ignored" || isIgnoredInSession;
        }

        return candidate.reviewStatus === selectedStatus && !isIgnoredInSession;
      }),
    [candidates, ignoredCandidateIds, selectedStatus],
  );
  const copyCandidates = copyCandidateIds
    .map((id) => candidates.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is CandidateEvent => Boolean(candidate));
  const copyTextValue = copyCandidates
    .map((candidate) => JSON.stringify(formatEventObject(candidate), null, 2))
    .join(",\n");
  const selectedCandidateIdsText = JSON.stringify(copyCandidateIds, null, 2);
  const ignoredCandidateIdsText = JSON.stringify(ignoredCandidateIds, null, 2);

  function addCopyCandidate(candidate: CandidateEvent) {
    setCopyCandidateIds((currentIds) => {
      if (currentIds.includes(candidate.id)) {
        return currentIds;
      }

      return [...currentIds, candidate.id];
    });
    setCopiedMessage(null);
  }

  function ignoreCandidate(candidate: CandidateEvent) {
    setIgnoredCandidateIds((currentIds) => {
      if (currentIds.includes(candidate.id)) {
        return currentIds;
      }

      return [...currentIds, candidate.id];
    });
    setCopyCandidateIds((currentIds) =>
      currentIds.filter((id) => id !== candidate.id),
    );
  }

  async function copySelectedCandidateIds() {
    await copyText(selectedCandidateIdsText);
    setCopiedMessage(`公開するIDを${copyCandidateIds.length}件コピーしました`);
  }

  async function copyIgnoredCandidateIds() {
    await copyText(ignoredCandidateIdsText);
    setCopiedMessage(`ignoreしたIDを${ignoredCandidateIds.length}件コピーしました`);
  }

  return (
    <>
      <div className={styles.adminToolbar}>
        {reviewStatuses.map((status) => (
          <button
            className={`${styles.adminStatusButton} ${
              selectedStatus === status ? styles.activeAdminStatusButton : ""
            }`}
            key={status}
            type="button"
            onClick={() => setSelectedStatus(status)}
          >
            {statusLabels[status]} (
            {
              candidates.filter((candidate) => {
                const isIgnoredInSession = ignoredCandidateIds.includes(candidate.id);

                if (status === "ignored") {
                  return candidate.reviewStatus === "ignored" || isIgnoredInSession;
                }

                return candidate.reviewStatus === status && !isIgnoredInSession;
              }).length
            }
            )
          </button>
        ))}
      </div>

      <section className={styles.adminCopyQueue}>
        <div className={styles.adminCandidateHeader}>
          <div>
            <h2>コピー対象</h2>
            <p className={styles.summary}>
              公開したい候補IDをここに集めます。このID一覧を貼ってもらえれば、公開リストへ追加します。
            </p>
          </div>
          <button
            className={styles.primaryLink}
            type="button"
            onClick={copySelectedCandidateIds}
            disabled={copyCandidateIds.length === 0}
          >
            IDをまとめてコピー
          </button>
        </div>

        {copyCandidates.length === 0 ? (
          <p className={styles.adminMutedText}>まだ公開するIDはありません。</p>
        ) : (
          <>
            <ul className={styles.adminCompactList}>
              {copyCandidates.map((candidate) => (
                <li key={candidate.id}>
                  <code>{candidate.id}</code> / {candidate.date ?? "日付未定"} /{" "}
                  {candidate.artists.join(" / ")}
                  <button
                    className={styles.adminTextButton}
                    type="button"
                    onClick={() =>
                      setCopyCandidateIds((currentIds) =>
                        currentIds.filter((id) => id !== candidate.id),
                      )
                    }
                  >
                    外す
                  </button>
                </li>
              ))}
            </ul>
            <pre className={styles.adminQueueJson}>{selectedCandidateIdsText}</pre>
            <details className={styles.adminDetails}>
              <summary>イベントJSONも確認する</summary>
              <pre className={styles.adminQueueJson}>{copyTextValue}</pre>
            </details>
          </>
        )}

        {ignoredCandidateIds.length > 0 && (
          <div className={styles.adminIgnoredIds}>
            <div className={styles.adminCandidateHeader}>
              <div>
                <h3>ignoreしたID</h3>
                <p className={styles.adminMutedText}>
                  ブラウザに保存中です。必要ならこの一覧も貼ってください。
                </p>
              </div>
              <button
                className={styles.secondaryLink}
                type="button"
                onClick={copyIgnoredCandidateIds}
              >
                ignore IDをコピー
              </button>
            </div>
            <pre className={styles.adminQueueJson}>{ignoredCandidateIdsText}</pre>
          </div>
        )}
        {copiedMessage && <p className={styles.adminMutedText}>{copiedMessage}</p>}
      </section>

      <div className={styles.adminCandidateList}>
        {filteredCandidates.map((candidate) => {
          const relatedEvents = findRelatedPublishedEvents(candidate, publishedEvents);
          const eventObject = JSON.stringify(formatEventObject(candidate), null, 2);
          const isCopyCandidate = copyCandidateIds.includes(candidate.id);
          const isIgnoredInSession = ignoredCandidateIds.includes(candidate.id);

          return (
            <article className={styles.adminCandidateCard} key={candidate.id}>
              <div className={styles.adminCandidateHeader}>
                <div>
                  <p className={styles.kicker}>{statusLabels[candidate.reviewStatus]}</p>
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

                <button
                  className={styles.primaryLink}
                  type="button"
                  onClick={() => addCopyCandidate(candidate)}
                  disabled={isCopyCandidate || isIgnoredInSession}
                >
                  {isCopyCandidate ? "追加済み" : "公開IDに追加"}
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
                  <dt>信頼度</dt>
                  <dd>{candidate.confidence}</dd>
                </div>
                <div>
                  <dt>メモ</dt>
                  <dd>{candidate.reviewNotes || "なし"}</dd>
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
                <button
                  className={styles.secondaryLink}
                  type="button"
                  onClick={() => ignoreCandidate(candidate)}
                  disabled={isIgnoredInSession}
                >
                  ignore
                </button>
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
