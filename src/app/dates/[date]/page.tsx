import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedEvents, type EventDate } from "../../../data/events";
import { formatEventDate, getEventMonthKey } from "../../../utils/date";
import { sortEventsByDate } from "../../../utils/events";
import { eventLinkLabels } from "../../../utils/eventLinks";
import { SiteAnalytics } from "../../Analytics";
import { EventDateGroup } from "../../EventDateGroup";
import styles from "../../page.module.css";

type DatePageProps = {
  params: Promise<{
    date: string;
  }>;
};

export const dynamicParams = false;

function getEventsByDate(date: string) {
  return sortEventsByDate(
    publishedEvents.filter((event) => event.date === date),
  );
}

function isEventDate(value: string): value is EventDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function generateStaticParams() {
  return Array.from(new Set(publishedEvents.map((event) => event.date))).map(
    (date) => ({
      date,
    }),
  );
}

export async function generateMetadata({
  params,
}: DatePageProps): Promise<Metadata> {
  const { date } = await params;
  const dateEvents = getEventsByDate(date);

  if (!isEventDate(date) || dateEvents.length === 0) {
    return {
      title: "対象日が見つかりません",
    };
  }

  const formattedDate = formatEventDate(date);
  const title = `${formattedDate}のメタルライブ・来日公演情報`;
  const description = `${formattedDate}に日本で開催されるメタル、ハードロック、ラウドロック、メタルコア、ハードコアのライブ日程・会場・チケット情報を掲載しています。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/dates/${date}`,
    },
    openGraph: {
      title,
      description,
      url: `/dates/${date}`,
    },
  };
}

export default async function DatePage({ params }: DatePageProps) {
  const { date } = await params;
  const dateEvents = getEventsByDate(date);

  if (!isEventDate(date) || dateEvents.length === 0) {
    notFound();
  }

  const monthKey = getEventMonthKey(date);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Date</p>
        <h1>{formatEventDate(date)}のメタルライブ</h1>
        <p className={styles.summary}>掲載イベント {dateEvents.length}件</p>
      </header>

      <section className={styles.upcomingSection}>
        <EventDateGroup date={date} events={dateEvents} linkToMonth={false} />
      </section>

      <div className={styles.footerNav}>
        <Link href={`/months/${monthKey}`}>{monthKey}のライブ一覧</Link>
        <Link href="/">{eventLinkLabels.allEvents}</Link>
      </div>

      <SiteAnalytics />
    </main>
  );
}
