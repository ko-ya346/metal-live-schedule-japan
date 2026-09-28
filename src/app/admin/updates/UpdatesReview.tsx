"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import type {
  EventUpdateCandidate,
  EventUpdateCandidateStatus,
} from "../../../data/event_update_candidates";
import type { Event } from "../../../data/events";
import { formatEventDate } from "../../../utils/date";
import adminStyles from "../../admin.module.css";
import styles from "../../page.module.css";

type UpdatesReviewProps = {
  events: Event[];
  updateCandidates: EventUpdateCandidate[];
};

type AdminUpdateAction = "save" | "apply" | "ignore";

const statusLabels: Record<EventUpdateCandidateStatus, string> = {
  review_needed: "要確認",
  applied: "適用済み",
  ignored: "対象外",
};

const updateTypeLabels: Record<EventUpdateCandidate["updateType"], string> = {
  lineup: "出演者",
  ticket: "チケット",
  schedule: "日程/時間",
  venue: "会場",
  status: "状況",
  official: "公式情報",
  metadata: "補足情報",
};

const reviewStatuses: EventUpdateCandidateStatus[] = [
  "review_needed",
  "applied",
  "ignored",
];

function createUpdateMap(updateCandidates: EventUpdateCandidate[]) {
  return Object.fromEntries(
    updateCandidates.map((candidate) => [candidate.id, candidate]),
  );
}

function findEvent(events: Event[], eventId: string) {
  return events.find((event) => event.id === eventId);
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseProposedChanges(value: string) {
  if (!value.trim()) {
    return {};
  }

  const parsed = JSON.parse(value) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("提案内容はオブジェクトJSONで入力してください");
  }

  return parsed as Partial<Event>;
}

async function postUpdateAction(
  action: AdminUpdateAction,
  candidate: EventUpdateCandidate,
) {
  const response = await fetch("/api/admin/updates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, candidate }),
  });

  const body = (await response.json()) as {
    candidate?: EventUpdateCandidate;
    error?: string;
  };

  if (!response.ok || !body.candidate) {
    throw new Error(body.error ?? "更新候補の保存に失敗しました");
  }

  return body.candidate;
}

export function UpdatesReview({
  events,
  updateCandidates,
}: UpdatesReviewProps) {
  const [editableCandidates, setEditableCandidates] = useState<
    Record<string, EventUpdateCandidate>
  >(() => createUpdateMap(updateCandidates));
  const [selectedStatus, setSelectedStatus] =
    useState<EventUpdateCandidateStatus>("review_needed");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);
  const candidateList = useMemo(
    () => Object.values(editableCandidates),
    [editableCandidates],
  );
  const filteredCandidates = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    return candidateList
      .filter((candidate) => candidate.reviewStatus === selectedStatus)
      .filter((candidate) => {
        if (normalizedQuery === "") {
          return true;
        }

        const event = findEvent(events, candidate.eventId);

        return [
          candidate.id,
          candidate.eventId,
          candidate.updateType,
          candidate.sourceName,
          candidate.reviewNotes,
          event?.artists.join(" "),
          event?.tourName,
          event?.venue,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => a.collectedAt.localeCompare(b.collectedAt));
  }, [candidateList, events, searchQuery, selectedStatus]);

  function updateCandidate(id: string, nextCandidate: EventUpdateCandidate) {
    setEditableCandidates((currentCandidates) => ({
      ...currentCandidates,
      [id]: nextCandidate,
    }));
  }

  async function runUpdateAction(
    action: AdminUpdateAction,
    candidate: EventUpdateCandidate,
  ) {
    if (
      action === "apply" &&
      !window.confirm(`${candidate.eventId} に変更を適用しますか？`)
    ) {
      return;
    }

    setStatusMessage(null);
    setPendingCandidateId(candidate.id);

    try {
      const nextCandidate = await postUpdateAction(action, candidate);
      updateCandidate(nextCandidate.id, nextCandidate);
      setStatusMessage(
        action === "apply"
          ? `${nextCandidate.id} を適用しました`
          : action === "ignore"
            ? `${nextCandidate.id} を対象外にしました`
            : `${nextCandidate.id} を保存しました`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "更新に失敗しました");
    } finally {
      setPendingCandidateId(null);
    }
  }

  function handleSubmit(
    submitEvent: FormEvent<HTMLFormElement>,
    candidate: EventUpdateCandidate,
  ) {
    submitEvent.preventDefault();

    const submitter = (submitEvent.nativeEvent as SubmitEvent).submitter;
    const action =
      submitter instanceof HTMLButtonElement ? submitter.value : "save";

    if (action !== "save" && action !== "apply" && action !== "ignore") {
      setStatusMessage("不明な操作です");
      return;
    }

    const formData = new FormData(submitEvent.currentTarget);
    const reviewNotes = String(formData.get("reviewNotes") ?? "").trim();
    const proposedChangesText = String(formData.get("proposedChanges") ?? "");

    try {
      runUpdateAction(action, {
        ...candidate,
        proposedChanges: parseProposedChanges(proposedChangesText),
        reviewNotes,
      });
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "提案内容の解析に失敗しました",
      );
    }
  }

  return (
    <>
      <section className={adminStyles.adminCopyQueue}>
        <div className={adminStyles.adminCandidateHeader}>
          <div>
            <h2>更新候補一覧</h2>
            <p className={styles.summary}>
              公開済みイベントへの変更候補です。適用するまで公開データは変わりません。
            </p>
          </div>
        </div>
        <div className={adminStyles.adminToolbar}>
          {reviewStatuses.map((status) => (
            <button
              className={`${adminStyles.adminStatusButton} ${
                selectedStatus === status ? adminStyles.activeAdminStatusButton : ""
              }`}
              key={status}
              onClick={() => setSelectedStatus(status)}
              type="button"
            >
              {statusLabels[status]}{" "}
              {candidateList.filter((candidate) => candidate.reviewStatus === status)
                .length}
            </button>
          ))}
        </div>
        <label className={styles.filterField}>
          <span>検索</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="アーティスト、会場、IDで検索"
          />
        </label>
        <p className={adminStyles.adminMutedText}>
          {filteredCandidates.length} / {candidateList.length} 件を表示中。本番環境では書き込みを無効にしています。
        </p>
        {statusMessage && <p className={adminStyles.adminInlineStatus}>{statusMessage}</p>}
      </section>

      <div className={adminStyles.adminCandidateList}>
        {filteredCandidates.map((candidate) => {
          const event = findEvent(events, candidate.eventId);
          const isPending = pendingCandidateId === candidate.id;

          return (
            <article className={adminStyles.adminCandidateCard} key={candidate.id}>
              <form onSubmit={(eventSubmit) => handleSubmit(eventSubmit, candidate)}>
                <div className={adminStyles.adminCandidateHeader}>
                  <div>
                    <p className={styles.kicker}>
                      {statusLabels[candidate.reviewStatus]} /{" "}
                      {updateTypeLabels[candidate.updateType]} / {candidate.confidence}
                    </p>
                    <h2>{event ? event.artists.join(" / ") : candidate.eventId}</h2>
                    <p className={adminStyles.adminCandidateId}>
                      更新ID: <code>{candidate.id}</code>
                    </p>
                    <p className={adminStyles.adminCandidateId}>
                      対象イベント: <code>{candidate.eventId}</code>
                    </p>
                    {event && (
                      <p className={styles.summary}>
                        {formatEventDate(event.date)} / {event.prefecture} / {event.venue}
                      </p>
                    )}
                  </div>
                </div>

                {!event && (
                  <p className={adminStyles.adminFieldWarning}>
                    対象イベントが公開データに見つかりません。eventId を確認してください。
                  </p>
                )}

                <div className={adminStyles.adminCompareGrid}>
                  <section className={adminStyles.adminCompareSection}>
                    <h3>現在の値</h3>
                    <pre>{stringifyJson(candidate.currentSnapshot)}</pre>
                  </section>
                  <section className={adminStyles.adminCompareSection}>
                    <h3>提案値</h3>
                    <textarea
                      name="proposedChanges"
                      defaultValue={stringifyJson(candidate.proposedChanges)}
                    />
                  </section>
                </div>

                <div className={adminStyles.adminEditGrid}>
                  <label>
                    元URL
                    <input readOnly value={candidate.sourceUrl} />
                  </label>
                  <label>
                    情報源
                    <input readOnly value={candidate.sourceName} />
                  </label>
                  <label>
                    レビューメモ
                    <textarea
                      name="reviewNotes"
                      defaultValue={candidate.reviewNotes}
                    />
                  </label>
                </div>

                <div className={adminStyles.adminLinkRow}>
                  <a
                    className={styles.secondaryLink}
                    href={candidate.sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    元URLを開く
                  </a>
                  {event && (
                    <a
                      className={styles.secondaryLink}
                      href={`/events/${event.id}`}
                      target="_blank"
                    >
                      公開ページを見る
                    </a>
                  )}
                  <button
                    className={styles.primaryLink}
                    disabled={isPending}
                    type="submit"
                    value="apply"
                  >
                    適用
                  </button>
                  <button
                    className={styles.secondaryLink}
                    disabled={isPending}
                    type="submit"
                    value="save"
                  >
                    保存
                  </button>
                  <button
                    className={styles.secondaryLink}
                    disabled={isPending}
                    type="submit"
                    value="ignore"
                  >
                    対象外
                  </button>
                </div>
              </form>
            </article>
          );
        })}
      </div>
    </>
  );
}
