import type { Metadata } from "next";
import { candidateEvents } from "../../../data/candidates";
import { events } from "../../../data/events";
import styles from "../../page.module.css";
import { CandidatesReview } from "./CandidatesReview";

export const metadata: Metadata = {
  title: "候補イベント確認 | Metal Live Schedule",
  description: "公開前の候補イベントを確認する管理用ページです。",
};

export default function AdminCandidatesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Admin</p>
        <h1>候補イベント確認</h1>
        <p className={styles.summary}>
          候補イベントを確認し、元URLや公開済みイベントと見比べながら、公開用データへコピーします。
        </p>
      </header>

      <CandidatesReview candidates={candidateEvents} publishedEvents={events} />
    </main>
  );
}
