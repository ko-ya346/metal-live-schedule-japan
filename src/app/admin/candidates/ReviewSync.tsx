"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import type { ReviewInfo } from "../../../server/candidateReview";
import styles from "../../admin.module.css";

type SyncContext = {
  info: ReviewInfo;
  disabled: boolean;
  run: <T>(operation: () => Promise<T>) => Promise<T>;
};
const Context = createContext<SyncContext | null>(null);
export const useReviewSync = () => useContext(Context);

export function ReviewSync({ info, initialMessage, children }: {
  info: ReviewInfo | null;
  initialMessage?: string;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(info?.pending ?? false);
  const [unsentChanges, setUnsentChanges] = useState(info?.unsentChanges ?? 0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(info?.pending ? "" : initialMessage ?? "");
  const running = useRef(false);
  if (!info) return children;

  function reload(nextMessage: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("adminMessage", nextMessage);
    window.location.assign(url);
  }
  async function run<T>(operation: () => Promise<T>): Promise<T> {
    if (running.current || pending) throw new Error("保存中、または未送信の結果があります。");
    running.current = true;
    setBusy(true);
    setMessage("Ubuntuに保存しています…");
    try {
      const result = await operation();
      reload("Ubuntuに保存しました。確認が終わったらレビュー結果をPRへ保存してください。");
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存状態を確認できません。再読み込みしてください。");
      try {
        const response = await fetch("/api/admin/review-sync", { cache: "no-store" });
        const body = await response.json();
        setPending(body.sync?.pending ?? true);
        setUnsentChanges(body.sync?.unsentChanges ?? unsentChanges);
      } catch { setPending(true); }
      throw error;
    } finally { running.current = false; setBusy(false); }
  }
  async function save() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage(pending ? "PRへの再送を確認しています…" : "検証してPRへ保存しています…");
    try {
      const response = await fetch("/api/admin/review-sync", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      reload("PRへ保存済みです。差分とチェックを確認してマージしてください。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "PRへの保存に失敗しました。"); }
    finally { running.current = false; setBusy(false); }
  }
  return (
    <Context.Provider value={{ info, disabled: busy || pending, run }}>
      <section className={styles.adminCopyQueue} aria-label="PRへの保存状態">
        <h2>候補PRへの保存</h2>
        <p>候補ごとの操作はUbuntuに保存します。確認が終わったら、まとめて同じPRへ送ってください。サイトへの公開は、人間がPRをマージした後です。</p>
        <p><a href={info.url} target="_blank" rel="noreferrer">候補PRを確認する</a></p>
        <p role="status">
          {message ? `${message} ` : ""}
          {pending ? "PRへの送信が未完了です。" : unsentChanges > 0 ? `未送信: ${unsentChanges}件` : "未送信の確認結果はありません。"}
        </p>
        {(pending || unsentChanges > 0) && (
          <button className={styles.adminStatusButton} type="button" disabled={busy} onClick={save}>
            {pending ? "PRへ再送" : "レビュー結果をPRへ保存"}
          </button>
        )}
      </section>
      {children}
    </Context.Provider>
  );
}
