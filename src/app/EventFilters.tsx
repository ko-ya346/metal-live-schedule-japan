import { ALL_FILTER_VALUE } from "../utils/events";
import styles from "./page.module.css";

type EventFiltersProps = {
  genres: string[];
  prefectures: string[];
  selectedGenre: string;
  selectedPrefecture: string;
  onGenreChange: (genre: string) => void;
  onPrefectureChange: (prefecture: string) => void;
};

export function EventFilters({
  genres,
  prefectures,
  selectedGenre,
  selectedPrefecture,
  onGenreChange,
  onPrefectureChange,
}: EventFiltersProps) {
  return (
    <section className={styles.filters} aria-label="Event filters">
      <label className={styles.filterField}>
        <span>Prefecture</span>
        <select
          value={selectedPrefecture}
          onChange={(event) => onPrefectureChange(event.target.value)}
        >
          <option value={ALL_FILTER_VALUE}>All prefectures</option>
          {prefectures.map((prefecture) => (
            <option key={prefecture} value={prefecture}>
              {prefecture}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filterField}>
        <span>Genre</span>
        <select
          value={selectedGenre}
          onChange={(event) => onGenreChange(event.target.value)}
        >
          <option value={ALL_FILTER_VALUE}>All genres</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
