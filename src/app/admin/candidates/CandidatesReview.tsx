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

function createCandidateMap(candidates: CandidateEvent[]) {
  return Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate]));
}

function listToText(values: string[]) {
  return values.join("\n");
}

function textToList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function postCandidateAction(
  action: "save" | "ignore" | "publish",
  candidate: CandidateEvent,
) {
  const response = await fetch("/api/admin/candidates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, candidate }),
  });

  const body = (await response.json()) as {
    candidate?: CandidateEvent;
    error?: string;
  };

  if (!response.ok || !body.candidate) {
    throw new Error(body.error ?? "候補の更新に失敗しました");
  }

  return body.candidate;
}

export function CandidatesReview({
  candidates,
  publishedEvents,
}: CandidatesReviewProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<CandidateEventStatus>("review_needed");
  const [editableCandidates, setEditableCandidates] = useState<
    Record<string, CandidateEvent>
  >(() => createCandidateMap(candidates));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const candidateList = useMemo(
    () => Object.values(editableCandidates),
    [editableCandidates],
  );
  const filteredCandidates = useMemo(
    () =>
      candidateList.filter((candidate) => candidate.reviewStatus === selectedStatus),
    [candidateList, selectedStatus],
  );

  function updateCandidate(id: string, nextCandidate: CandidateEvent) {
    setEditableCandidates((currentCandidates) => ({
      ...currentCandidates,
      [id]: nextCandidate,
    }));
  }

  async function runCandidateAction(
    action: "save" | "ignore" | "publish",
    candidate: CandidateEvent,
  ) {
    setStatusMessage(null);

    try {
      const nextCandidate = await postCandidateAction(action, candidate);
      updateCandidate(nextCandidate.id, nextCandidate);
      setStatusMessage(
        action === "publish"
          ? `${candidate.id} を公開しました`
          : action === "ignore"
            ? `${candidate.id} を対象外にしました`
            : `${candidate.id} を保存しました`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "更新に失敗しました");
    }
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
            {candidateList.filter((candidate) => candidate.reviewStatus === status).length}
            )
          </button>
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
        {statusMessage && <p className={styles.adminMutedText}>{statusMessage}</p>}
      </section>

      <div className={styles.adminCandidateList}>
        {filteredCandidates.map((candidate) => {
          const relatedEvents = findRelatedPublishedEvents(candidate, publishedEvents);
          const eventObject = JSON.stringify(formatEventObject(candidate), null, 2);
          const isPublished = candidate.reviewStatus === "published";
          const isIgnored = candidate.reviewStatus === "ignored";

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
              </div>

              <div className={styles.adminEditGrid}>
                <label>
                  アーティスト
                  <textarea
                    value={listToText(candidate.artists)}
                    onChange={(event) =>
                      updateCandidate(candidate.id, {
                        ...candidate,
                        artists: textToList(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  ツアー/イベント名
                  <input
                    value={candidate.tourName ?? ""}
                    onChange={(event) =>
                      updateCandidate(candidate.id, {
                        ...candidate,
                        tourName: event.target.value || null,
                      })
                    }
                  />
                </label>
                <label>
                  日付
                  <input
                    placeholder="YYYY-MM-DD"
                    value={candidate.date ?? ""}
                    onChange={(event) =>
                      updateCandidate(candidate.id, {
                        ...candidate,
                        date: event.target.value || null,
                      })
                    }
                  />
                </label>
                <label>
                  都道府県
                  <input
                    value={candidate.prefecture ?? ""}
                    onChange={(event) =>
                      updateCandidate(candidate.id, {
                        ...candidate,
                        prefecture: event.target.value || null,
                      })
                    }
                  />
                </label>
                <label>
                  会場
                  <input
                    value={candidate.venue ?? ""}
                    onChange={(event) =>
                      updateCandidate(candidate.id, {
                        ...candidate,
                        venue: event.target.value || null,
                      })
                    }
                  />
                </label>
                <label>
                  ジャンル
                  <textarea
                    value={listToText(candidate.genres)}
                    onChange={(event) =>
                      updateCandidate(candidate.id, {
                        ...candidate,
                        genres: textToList(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  チケットURL
                  <input
                    value={candidate.ticketUrl ?? ""}
                    onChange={(event) =>
                      updateCandidate(candidate.id, {
                        ...candidate,
                        ticketUrl: event.target.value || null,
                      })
                    }
                  />
                </label>
                <label>
                  公式URL
                  <input
                    value={candidate.officialUrl ?? ""}
                    onChange={(event) =>
                      updateCandidate(candidate.id, {
                        ...candidate,
                        officialUrl: event.target.value || null,
                      })
                    }
                  />
                </label>
                <label>
                  メモ
                  <textarea
                    value={candidate.reviewNotes}
                    onChange={(event) =>
                      updateCandidate(candidate.id, {
                        ...candidate,
                        reviewNotes: event.target.value,
                      })
                    }
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
                  type="button"
                  onClick={() => runCandidateAction("save", candidate)}
                >
                  保存
                </button>
                <button
                  className={styles.secondaryLink}
                  type="button"
                  onClick={() => runCandidateAction("ignore", candidate)}
                  disabled={isIgnored}
                >
                  ignore
                </button>
                <button
                  className={styles.primaryLink}
                  type="button"
                  onClick={() => runCandidateAction("publish", candidate)}
                  disabled={isPublished || isIgnored}
                >
                  公開する
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
