import {
  ALL_FILTER_VALUE,
  DATE_RANGE_ALL_VALUE,
  type DateRangeFilter,
} from "../utils/events";
import styles from "./page.module.css";

type EventFiltersProps = {
  genres: string[];
  prefectures: string[];
  selectedGenre: string;
  selectedPrefecture: string;
  selectedDateRange: DateRangeFilter;
  searchQuery: string;
  canReset: boolean;
  onGenreChange: (genre: string) => void;
  onPrefectureChange: (prefecture: string) => void;
  onDateRangeChange: (dateRange: DateRangeFilter) => void;
  onSearchQueryChange: (query: string) => void;
  onReset: () => void;
};

export function EventFilters({
  genres,
  prefectures,
  selectedGenre,
  selectedPrefecture,
  selectedDateRange,
  searchQuery,
  canReset,
  onGenreChange,
  onPrefectureChange,
  onDateRangeChange,
  onSearchQueryChange,
  onReset,
}: EventFiltersProps) {
  return (
    <section className={styles.filters} aria-label="ライブの絞り込み">
      <label className={`${styles.filterField} ${styles.searchField}`}>
        <span>キーワード検索</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="アーティスト、会場、ライブ名など"
        />
      </label>

      <label className={styles.filterField}>
        <span>都道府県</span>
        <select
          value={selectedPrefecture}
          onChange={(event) => onPrefectureChange(event.target.value)}
        >
          <option value={ALL_FILTER_VALUE}>すべての都道府県</option>
          {prefectures.map((prefecture) => (
            <option key={prefecture} value={prefecture}>
              {prefecture}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filterField}>
        <span>期間</span>
        <select
          value={selectedDateRange}
          onChange={(event) =>
            onDateRangeChange(event.target.value as DateRangeFilter)
          }
        >
          <option value={DATE_RANGE_ALL_VALUE}>すべての期間</option>
          <option value="thisWeek">今週</option>
          <option value="thisMonth">今月</option>
        </select>
      </label>

      <label className={styles.filterField}>
        <span>ジャンル</span>
        <select
          value={selectedGenre}
          onChange={(event) => onGenreChange(event.target.value)}
        >
          <option value={ALL_FILTER_VALUE}>すべてのジャンル</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.filterActions}>
        <button
          className={styles.resetButton}
          type="button"
          onClick={onReset}
          disabled={!canReset}
        >
          絞り込みをリセット
        </button>
      </div>
    </section>
  );
}
