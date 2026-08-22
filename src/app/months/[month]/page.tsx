import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedEvents } from "../../../data/events";
import {
  getGroupedEventDates,
  groupEventsByDate,
  sortEventsByDate,
} from "../../../utils/events";
import {
  getEventMonthByKey,
  getEventMonths,
  getEventsByMonthKey,
} from "../../../utils/months";
import { SiteAnalytics } from "../../Analytics";
import { EventDateGroup } from "../../EventDateGroup";
import { eventLinkLabels } from "../../../utils/eventLinks";
import styles from "../../page.module.css";

type MonthPageProps = {
  params: Promise<{
    month: string;
  }>;
};

export function generateStaticParams() {
  return getEventMonths(publishedEvents).map((month) => ({
    month: month.key,
  }));
}

export async function generateMetadata({
  params,
}: MonthPageProps): Promise<Metadata> {
  const { month: monthKey } = await params;
  const month = getEventMonthByKey(publishedEvents, monthKey);

  if (!month) {
    return {
      title: "対象月が見つかりません",
    };
  }

  const title = `${month.label}のメタルライブ・来日公演情報`;
  const description = `${month.label}に日本で開催されるメタル、ハードロック、ラウドロック、メタルコア、ハードコアのライブ日程・会場・チケット情報を掲載しています。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/months/${month.key}`,
    },
    openGraph: {
      title,
      description,
      url: `/months/${month.key}`,
    },
  };
}

export default async function MonthPage({ params }: MonthPageProps) {
  const { month: monthKey } = await params;
  const month = getEventMonthByKey(publishedEvents, monthKey);

  if (!month) {
    notFound();
  }

  const monthEvents = sortEventsByDate(
    getEventsByMonthKey(publishedEvents, month.key),
  );
  const eventsByDate = groupEventsByDate(monthEvents);
  const dates = getGroupedEventDates(eventsByDate);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Month</p>
        <h1>{month.label}のメタルライブ</h1>
        <p className={styles.summary}>掲載イベント {monthEvents.length}件</p>
      </header>

      <section className={styles.upcomingSection}>
        <div className={styles.dateGroups}>
          {dates.map((date) => (
            <EventDateGroup
              date={date}
              events={eventsByDate[date]}
              key={date}
              linkToMonth={false}
            />
          ))}
        </div>
      </section>

      <Link className={styles.textLink} href="/">{eventLinkLabels.allEvents}</Link>

      <SiteAnalytics />
    </main>
  );
}
