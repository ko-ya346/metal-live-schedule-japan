"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
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

type AdminSubmitButtonProps = {
  children: ReactNode;
  className: string;
  disabled?: boolean;
  isPending?: boolean;
  name: string;
  title?: string;
  value: string;
};

function AdminSubmitButton({
  children,
  className,
  disabled = false,
  isPending = false,
  name,
  title,
  value,
}: AdminSubmitButtonProps) {
  return (
    <button
      className={className}
      disabled={disabled || isPending}
      name={name}
      type="submit"
      value={value}
      title={title}
    >
      {children}
    </button>
  );
}

function formValueToString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formValueToList(formData: FormData, key: string) {
  return formValueToString(formData, key)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formDataToCandidate(
  candidate: CandidateEvent,
  formData: FormData,
): CandidateEvent {
  return {
    ...candidate,
    artists: formValueToList(formData, "artists"),
    tourName: formValueToString(formData, "tourName") || null,
    date: formValueToString(formData, "date") || null,
    prefecture: formValueToString(formData, "prefecture") || null,
    venue: formValueToString(formData, "venue") || null,
    genres: formValueToList(formData, "genres"),
    isInternational: formData.get("isInternational") === "on",
    ticketUrl: formValueToString(formData, "ticketUrl") || null,
    officialUrl: formValueToString(formData, "officialUrl") || null,
    reviewNotes: formValueToString(formData, "reviewNotes"),
  };
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
    throw new Error(body.error ?? "候補イベントの更新に失敗しました");
  }

  return body.candidate;
}

export function CandidatesReview({
  candidates,
  publishedEvents,
  selectedStatus,
  initialStatusMessage = null,
}: CandidatesReviewProps) {
  const [editableCandidates, setEditableCandidates] = useState<
    Record<string, CandidateEvent>
  >(() => Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate])));
  const [statusMessage, setStatusMessage] = useState<string | null>(
    initialStatusMessage,
  );
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);
  const candidateList = useMemo(
    () => Object.values(editableCandidates),
    [editableCandidates],
  );
  const filteredCandidates = candidateList.filter(
    (candidate) => candidate.reviewStatus === selectedStatus,
  );

  async function handleCandidateSubmit(
    event: FormEvent<HTMLFormElement>,
    candidate: CandidateEvent,
  ) {
    event.preventDefault();

    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const action =
      submitter instanceof HTMLButtonElement ? submitter.value : "save";

    if (action !== "save" && action !== "ignore" && action !== "publish") {
      setStatusMessage("不明な操作です");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const nextCandidate = formDataToCandidate(candidate, formData);

    setStatusMessage(null);
    setPendingCandidateId(candidate.id);

    try {
      const savedCandidate = await postCandidateAction(action, nextCandidate);
      setEditableCandidates((currentCandidates) => ({
        ...currentCandidates,
        [savedCandidate.id]: savedCandidate,
      }));
      setStatusMessage(
        action === "publish"
          ? `${savedCandidate.id} を公開しました`
          : action === "ignore"
            ? `${savedCandidate.id} を対象外にしました`
            : `${savedCandidate.id} を保存しました`,
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "候補イベントの更新に失敗しました",
      );
    } finally {
      setPendingCandidateId(null);
    }
  }

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
            {
              candidateList.filter((candidate) => candidate.reviewStatus === status)
                .length
            }
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
        {statusMessage && (
          <p className={styles.adminInlineStatus} role="status">
            {statusMessage}
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
          const isPending = pendingCandidateId === candidate.id;

          return (
            <article className={styles.adminCandidateCard} key={candidate.id}>
              <form
                action="/api/admin/candidates"
                method="post"
                onSubmit={(event) => handleCandidateSubmit(event, candidate)}
              >
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
                  <AdminSubmitButton
                    className={styles.secondaryLink}
                    isPending={isPending}
                    name="action"
                    value="save"
                  >
                    保存
                  </AdminSubmitButton>
                  <AdminSubmitButton
                    className={styles.secondaryLink}
                    disabled={isIgnored}
                    isPending={isPending}
                    name="action"
                    value="ignore"
                  >
                    ignore
                  </AdminSubmitButton>
                  <AdminSubmitButton
                    className={styles.primaryLink}
                    disabled={!canPublish}
                    isPending={isPending}
                    name="action"
                    value="publish"
                    title={
                      missingPublishFields.length > 0
                        ? `公開には ${missingPublishFields.join("、")} が必要です`
                        : undefined
                    }
                  >
                    {publishButtonLabel}
                  </AdminSubmitButton>
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
                {isPending && (
                  <p className={styles.adminMutedText} role="status">
                    処理中です。完了するまでそのままお待ちください。
                  </p>
                )}
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
