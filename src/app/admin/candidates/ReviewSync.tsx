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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(info?.pending ? "" : initialMessage ?? "");
  const running = useRef(false);
  if (!info) return children;

  function reload() {
    const url = new URL(window.location.href);
    url.searchParams.set("adminMessage", "PRへ保存済みです。差分とチェックを確認してマージしてください。");
    window.location.assign(url);
  }
  async function run<T>(operation: () => Promise<T>): Promise<T> {
    if (running.current || pending) throw new Error("保存中、または未送信の結果があります。");
    running.current = true;
    setBusy(true);
    setMessage("検証してPRへ保存しています…");
    try {
      const result = await operation();
      reload();
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存状態を確認できません。再読み込みしてください。");
      try {
        const response = await fetch("/api/admin/review-sync", { cache: "no-store" });
        const body = await response.json();
        setPending(body.sync?.pending ?? true);
      } catch { setPending(true); }
      throw error;
    } finally { running.current = false; setBusy(false); }
  }
  async function retry() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage("PRへの送信を確認しています…");
    try {
      const response = await fetch("/api/admin/review-sync", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "再送に失敗しました。"); }
    finally { running.current = false; setBusy(false); }
  }
  return (
    <Context.Provider value={{ info, disabled: busy || pending, run }}>
      <section className={styles.adminCopyQueue} aria-label="PRへの保存状態">
        <h2>候補PRへ自動保存</h2>
        <p>保存・採用・対象外の判断を同じPRへ送ります。サイトへの公開は、人間がPRをマージした後です。</p>
        <p><a href={info.url} target="_blank" rel="noreferrer">候補PRを確認する</a></p>
        <p role="status">{message || (pending ? "未送信の確認結果があります。" : "保存先を接続済みです。")}</p>
        {pending && <button type="button" disabled={busy} onClick={retry}>PRへ再送</button>}
      </section>
      {children}
    </Context.Provider>
  );
}
