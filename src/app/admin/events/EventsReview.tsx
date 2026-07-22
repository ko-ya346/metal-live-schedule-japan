"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import type { Event, EventStatus } from "../../../data/events";
import { formatEventDate } from "../../../utils/date";
import styles from "../../page.module.css";

type EventsReviewProps = {
  events: Event[];
};

const eventStatuses: EventStatus[] = ["scheduled", "postponed", "cancelled"];

const eventStatusLabels: Record<EventStatus, string> = {
  scheduled: "開催予定",
  postponed: "延期",
  cancelled: "中止",
};

function createEventMap(events: Event[]) {
  return Object.fromEntries(events.map((event) => [event.id, event]));
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

function formDataToEvent(event: Event, formData: FormData): Event {
  return {
    ...event,
    artists: formValueToList(formData, "artists"),
    tourName: formValueToString(formData, "tourName"),
    date: formValueToString(formData, "date") as Event["date"],
    prefecture: formValueToString(formData, "prefecture"),
    venue: formValueToString(formData, "venue"),
    genres: formValueToList(formData, "genres"),
    isInternational: formData.get("isInternational") === "on",
    ticketUrl: formValueToString(formData, "ticketUrl") || null,
    officialUrl: formValueToString(formData, "officialUrl") || null,
    status: formValueToString(formData, "status") as EventStatus,
  };
}

async function postEventAction(action: "save" | "unpublish", event: Event) {
  const response = await fetch("/api/admin/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, event }),
  });

  const body = (await response.json()) as {
    event?: Event;
    error?: string;
  };

  if (!response.ok || !body.event) {
    throw new Error(body.error ?? "公開イベントの更新に失敗しました");
  }

  return body.event;
}

export function EventsReview({ events }: EventsReviewProps) {
  const [editableEvents, setEditableEvents] = useState<Record<string, Event>>(() =>
    createEventMap(events),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const eventList = useMemo(() => Object.values(editableEvents), [editableEvents]);
  const filteredEvents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    return eventList
      .filter((event) => {
        if (normalizedQuery === "") {
          return true;
        }

        return [
          event.id,
          event.artists.join(" "),
          event.tourName,
          event.prefecture,
          event.venue,
          event.genres.join(" "),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [eventList, searchQuery]);

  function updateEvent(id: string, nextEvent: Event) {
    setEditableEvents((currentEvents) => ({
      ...currentEvents,
      [id]: nextEvent,
    }));
  }

  async function runEventAction(action: "save" | "unpublish", event: Event) {
    if (
      action === "unpublish" &&
      !window.confirm(
        `${event.artists.join(" / ")} を公開一覧から外して ignored に入れますか？`,
      )
    ) {
      return;
    }

    setStatusMessage(null);
    setPendingEventId(event.id);

    try {
      const nextEvent = await postEventAction(action, event);

      if (action === "unpublish") {
        setEditableEvents((currentEvents) => {
          const nextEvents = { ...currentEvents };
          delete nextEvents[nextEvent.id];
          return nextEvents;
        });
        setStatusMessage(`${event.id} を公開取り消しにしました`);
        return;
      }

      updateEvent(nextEvent.id, nextEvent);
      setStatusMessage(`${event.id} を保存しました`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "更新に失敗しました");
    } finally {
      setPendingEventId(null);
    }
  }

  function handleEventSubmit(submitEvent: FormEvent<HTMLFormElement>, event: Event) {
    submitEvent.preventDefault();

    const submitter = (submitEvent.nativeEvent as SubmitEvent).submitter;
    const action =
      submitter instanceof HTMLButtonElement ? submitter.value : "save";

    if (action !== "save" && action !== "unpublish") {
      setStatusMessage("不明な操作です");
      return;
    }

    const formData = new FormData(submitEvent.currentTarget);
    runEventAction(action, formDataToEvent(event, formData));
  }

  return (
    <>
      <section className={styles.adminCopyQueue}>
        <div className={styles.adminCandidateHeader}>
          <div>
            <h2>公開イベント管理</h2>
            <p className={styles.summary}>
              公開済みイベントを編集できます。公開取り消しはイベント一覧から外し、候補データの ignored に残します。
            </p>
          </div>
        </div>
        <label className={styles.filterField}>
          <span>検索</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="アーティスト、会場、IDで検索"
          />
        </label>
        <p className={styles.adminMutedText}>
          {filteredEvents.length} / {eventList.length} 件を表示中。本番環境では書き込みを無効にしています。
        </p>
        {statusMessage && <p className={styles.adminMutedText}>{statusMessage}</p>}
      </section>

      <div className={styles.adminCandidateList}>
        {filteredEvents.map((event) => {
          const isPending = pendingEventId === event.id;

          return (
          <article className={styles.adminCandidateCard} key={event.id}>
            <form onSubmit={(submitEvent) => handleEventSubmit(submitEvent, event)}>
            <div className={styles.adminCandidateHeader}>
              <div>
                <p className={styles.kicker}>{eventStatusLabels[event.status]}</p>
                <h2>{event.artists.join(" / ")}</h2>
                <p className={styles.adminCandidateId}>
                  ID: <code>{event.id}</code>
                </p>
                <p className={styles.summary}>
                  {formatEventDate(event.date)} / {event.prefecture} / {event.venue}
                </p>
              </div>
            </div>

            <div className={styles.adminEditGrid}>
              <label>
                アーティスト
                <textarea
                  name="artists"
                  value={listToText(event.artists)}
                  onChange={(changeEvent) =>
                    updateEvent(event.id, {
                      ...event,
                      artists: textToList(changeEvent.target.value),
                    })
                  }
                />
              </label>
              <label>
                ツアー/イベント名
                <input
                  name="tourName"
                  value={event.tourName}
                  onChange={(changeEvent) =>
                    updateEvent(event.id, {
                      ...event,
                      tourName: changeEvent.target.value,
                    })
                  }
                />
              </label>
              <label>
                日付
                <input
                  name="date"
                  placeholder="YYYY-MM-DD"
                  value={event.date}
                  onChange={(changeEvent) =>
                    updateEvent(event.id, {
                      ...event,
                      date: changeEvent.target.value as Event["date"],
                    })
                  }
                />
              </label>
              <label>
                都道府県
                <input
                  name="prefecture"
                  value={event.prefecture}
                  onChange={(changeEvent) =>
                    updateEvent(event.id, {
                      ...event,
                      prefecture: changeEvent.target.value,
                    })
                  }
                />
              </label>
              <label>
                会場
                <input
                  name="venue"
                  value={event.venue}
                  onChange={(changeEvent) =>
                    updateEvent(event.id, {
                      ...event,
                      venue: changeEvent.target.value,
                    })
                  }
                />
              </label>
              <label>
                ジャンル
                <textarea
                  name="genres"
                  value={listToText(event.genres)}
                  onChange={(changeEvent) =>
                    updateEvent(event.id, {
                      ...event,
                      genres: textToList(changeEvent.target.value),
                    })
                  }
                />
              </label>
              <label className={styles.adminCheckboxField}>
                <input
                  checked={event.isInternational}
                  name="isInternational"
                  type="checkbox"
                  onChange={(changeEvent) =>
                    updateEvent(event.id, {
                      ...event,
                      isInternational: changeEvent.target.checked,
                    })
                  }
                />
                来日公演
              </label>
              <label>
                チケットURL
                <input
                  name="ticketUrl"
                  value={event.ticketUrl ?? ""}
                  onChange={(changeEvent) =>
                    updateEvent(event.id, {
                      ...event,
                      ticketUrl: changeEvent.target.value || null,
                    })
                  }
                />
              </label>
              <label>
                公式URL
                <input
                  name="officialUrl"
                  value={event.officialUrl ?? ""}
                  onChange={(changeEvent) =>
                    updateEvent(event.id, {
                      ...event,
                      officialUrl: changeEvent.target.value || null,
                    })
                  }
                />
              </label>
              <label>
                ステータス
                <select
                  name="status"
                  value={event.status}
                  onChange={(changeEvent) =>
                    updateEvent(event.id, {
                      ...event,
                      status: changeEvent.target.value as EventStatus,
                    })
                  }
                >
                  {eventStatuses.map((status) => (
                    <option key={status} value={status}>
                      {eventStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.adminLinkRow}>
              <button
                className={styles.secondaryLink}
                disabled={isPending}
                name="action"
                type="submit"
                value="save"
              >
                保存
              </button>
              <button
                className={styles.secondaryLink}
                disabled={isPending}
                name="action"
                type="submit"
                value="unpublish"
              >
                公開取り消し
              </button>
              {event.officialUrl && (
                <a
                  className={styles.secondaryLink}
                  href={event.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  公式URL
                </a>
              )}
              {event.ticketUrl && (
                <a
                  className={styles.secondaryLink}
                  href={event.ticketUrl}
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
            </form>
          </article>
          );
        })}
      </div>
    </>
  );
}
