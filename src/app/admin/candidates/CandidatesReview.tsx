"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import type { CandidateEvent, CandidateEventStatus } from "../../../data/candidates";
import type { Event, TicketLink, TicketSaleStatus } from "../../../data/events";
import { formatEventDate } from "../../../utils/date";
import adminStyles from "../../admin.module.css";
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
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferTicketProvider(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes("eplus.jp")) {
      return "eplus";
    }

    if (hostname.includes("pia.jp") || hostname.includes("t.pia.jp")) {
      return "pia";
    }

    if (hostname.includes("l-tike.com")) {
      return "lawson";
    }

    if (hostname.includes("livepocket.jp")) {
      return "livepocket";
    }

    if (hostname.includes("ticket.rakuten.co.jp")) {
      return "rakuten";
    }

    if (hostname.includes("creativeman.co.jp")) {
      return "creativeman";
    }

    if (hostname.includes("smash-jpn.com")) {
      return "smash";
    }

    if (hostname.includes("evp.jp")) {
      return "evp";
    }
  } catch {
    return "other";
  }

  return "other";
}

function ticketLinksToText(ticketLinks: CandidateEvent["ticketLinks"]) {
  const links = ticketLinks ?? [];
  const hasStructuredFields = links.some(
    (ticketLink) =>
      ticketLink.affiliateUrl ||
      ticketLink.price !== undefined ||
      ticketLink.saleStartsAt ||
      ticketLink.saleStatus ||
      ticketLink.saleEndsAt,
  );

  if (hasStructuredFields) {
    return JSON.stringify(links, null, 2);
  }

  return links
    .map((ticketLink) => {
      if (!ticketLink.provider || ticketLink.provider === inferTicketProvider(ticketLink.url)) {
        return ticketLink.url;
      }

      return `${ticketLink.provider} ${ticketLink.url}`;
    })
    .join("\n");
}

function normalizeTicketLink(ticketLink: unknown, priority: number): TicketLink | null {
  if (!ticketLink || typeof ticketLink !== "object") {
    return null;
  }

  const link = ticketLink as Record<string, unknown>;
  const url = typeof link.url === "string" ? link.url.trim() : "";

  if (!url) {
    return null;
  }

  const price =
    typeof link.price === "number" && Number.isFinite(link.price)
      ? link.price
      : typeof link.price === "string" && link.price.trim() !== ""
        ? Number(link.price)
        : undefined;

  const saleStatus: TicketSaleStatus =
    link.saleStatus === "on_sale" ||
    link.saleStatus === "presale" ||
    link.saleStatus === "sold_out" ||
    link.saleStatus === "not_started" ||
    link.saleStatus === "unknown"
      ? link.saleStatus
      : "unknown";

  return {
    provider:
      typeof link.provider === "string" && link.provider.trim()
        ? link.provider.trim()
        : inferTicketProvider(url),
    url,
    affiliateUrl:
      typeof link.affiliateUrl === "string" && link.affiliateUrl.trim()
        ? link.affiliateUrl.trim()
        : null,
    ...(price !== undefined && Number.isFinite(price) ? { price } : {}),
    saleStartsAt:
      typeof link.saleStartsAt === "string" && link.saleStartsAt.trim()
        ? link.saleStartsAt.trim()
        : null,
    saleStatus,
    saleEndsAt:
      typeof link.saleEndsAt === "string" && link.saleEndsAt.trim()
        ? link.saleEndsAt.trim()
        : null,
    priority:
      typeof link.priority === "number" && Number.isInteger(link.priority)
        ? link.priority
        : priority,
  };
}

function formValueToTicketLinks(formData: FormData): CandidateEvent["ticketLinks"] {
  const value = formValueToString(formData, "ticketLinks");

  if (!value) {
    return undefined;
  }

  if (value.startsWith("[")) {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("チケットリンクは配列JSON、または1行1URLで入力してください");
    }

    return parsed
      .map((ticketLink, index) => normalizeTicketLink(ticketLink, index + 1))
      .filter((ticketLink): ticketLink is NonNullable<typeof ticketLink> =>
        Boolean(ticketLink),
      );
  }

  return value
    .split(/\n/)
    .map((line, index) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        return null;
      }

      const [firstValue, ...restValues] = trimmedLine.split(/\s+/);
      const explicitUrl = restValues.join(" ");
      const url = explicitUrl || firstValue;
      const provider = explicitUrl ? firstValue : inferTicketProvider(url);

      return {
        provider,
        url,
        affiliateUrl: null,
        saleStartsAt: null,
        saleStatus: "unknown" as const,
        saleEndsAt: null,
        priority: index + 1,
      };
    })
    .filter((ticketLink): ticketLink is NonNullable<typeof ticketLink> =>
      Boolean(ticketLink),
    );
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
    endDate: formValueToString(formData, "endDate") || null,
    prefecture: formValueToString(formData, "prefecture") || null,
    venue: formValueToString(formData, "venue") || null,
    genres: formValueToList(formData, "genres"),
    isInternational: formData.get("isInternational") === "on",
    ticketUrl: formValueToString(formData, "ticketUrl") || null,
    ticketLinks: formValueToTicketLinks(formData),
    imageUrl: formValueToString(formData, "imageUrl") || null,
    organizerName: formValueToString(formData, "organizerName") || null,
    organizerUrl: formValueToString(formData, "organizerUrl") || null,
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
      <div className={adminStyles.adminToolbar}>
        {reviewStatuses.map((status) => (
          <Link
            className={`${adminStyles.adminStatusButton} ${
              selectedStatus === status ? adminStyles.activeAdminStatusButton : ""
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

      <section className={adminStyles.adminCopyQueue}>
        <div className={adminStyles.adminCandidateHeader}>
          <div>
            <h2>ローカル管理</h2>
            <p className={styles.summary}>
              この画面の編集、ignore、公開はローカル開発サーバー上のデータファイルへ保存します。
            </p>
          </div>
        </div>
        <p className={adminStyles.adminMutedText}>
          本番環境では書き込みを無効にしています。操作後は `npm run build` で確認してください。
        </p>
        {statusMessage && (
          <p className={adminStyles.adminInlineStatus} role="status">
            {statusMessage}
          </p>
        )}
      </section>

      <div className={adminStyles.adminCandidateList}>
        {filteredCandidates.map((candidate) => {
          const relatedEvents = findRelatedPublishedEvents(candidate, publishedEvents);
          const isPublished = candidate.reviewStatus === "published";
          const isIgnored = candidate.reviewStatus === "ignored";
          const missingPublishFields = getMissingPublishFields(candidate);
          const canPublish = !isPublished && missingPublishFields.length === 0;
          const publishButtonLabel = isIgnored ? "公開に戻す" : "公開する";
          const isPending = pendingCandidateId === candidate.id;

          return (
            <article className={adminStyles.adminCandidateCard} key={candidate.id}>
              <form
                action="/api/admin/candidates"
                method="post"
                onSubmit={(event) => handleCandidateSubmit(event, candidate)}
              >
                <input name="candidateId" type="hidden" value={candidate.id} />

                <div className={adminStyles.adminCandidateHeader}>
                  <div>
                    <p className={styles.kicker}>
                      {statusLabels[candidate.reviewStatus]}
                    </p>
                    <h2>{candidate.artists.join(" / ")}</h2>
                    <p className={adminStyles.adminCandidateId}>
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

                <div className={adminStyles.adminEditGrid}>
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
                    終了日
                    <input
                      defaultValue={candidate.endDate ?? ""}
                      name="endDate"
                      placeholder="YYYY-MM-DD（複数日公演のみ）"
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
                  <label className={adminStyles.adminCheckboxField}>
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
                    チケットリンク
                    <textarea
                      defaultValue={ticketLinksToText(candidate.ticketLinks)}
                      name="ticketLinks"
                      placeholder={'https://eplus.jp/...\npia https://t.pia.jp/...\nまたは [{"provider":"eplus","url":"https://...","price":8800,"saleStartsAt":"2026-01-01","saleStatus":"on_sale"}]'}
                    />
                  </label>
                  <label>
                    画像URL
                    <input
                      defaultValue={candidate.imageUrl ?? ""}
                      name="imageUrl"
                    />
                  </label>
                  <label>
                    主催者名
                    <input
                      defaultValue={candidate.organizerName ?? ""}
                      name="organizerName"
                    />
                  </label>
                  <label>
                    主催者URL
                    <input
                      defaultValue={candidate.organizerUrl ?? ""}
                      name="organizerUrl"
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

                <dl className={adminStyles.adminCandidateMeta}>
                  <div>
                    <dt>情報源</dt>
                    <dd>{candidate.sourceName}</dd>
                  </div>
                  <div>
                    <dt>信頼度</dt>
                    <dd>{candidate.confidence}</dd>
                  </div>
                </dl>

                <div className={adminStyles.adminLinkRow}>
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
                  <p className={adminStyles.adminMutedText} role="status">
                    処理中です。完了するまでそのままお待ちください。
                  </p>
                )}
                {missingPublishFields.length > 0 && (
                  <p className={adminStyles.adminFieldWarning} role="status">
                    公開には {missingPublishFields.join(" / ")} が必要です。先に保存して埋めてください。
                  </p>
                )}
              </form>

              <section className={adminStyles.adminCompareSection}>
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
