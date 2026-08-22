import { ALL_FILTER_VALUE } from "../utils/events";
import styles from "./page.module.css";

type EventFiltersProps = {
  genres: string[];
  prefectures: string[];
  selectedGenre: string;
  selectedPrefecture: string;
  internationalOnly: boolean;
  searchQuery: string;
  canReset: boolean;
  onGenreChange: (genre: string) => void;
  onPrefectureChange: (prefecture: string) => void;
  onInternationalOnlyChange: (internationalOnly: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  onReset: () => void;
};

export function EventFilters({
  genres,
  prefectures,
  selectedGenre,
  selectedPrefecture,
  internationalOnly,
  searchQuery,
  canReset,
  onGenreChange,
  onPrefectureChange,
  onInternationalOnlyChange,
  onSearchQueryChange,
  onReset,
}: EventFiltersProps) {
  const prefectureQuery =
    selectedPrefecture === ALL_FILTER_VALUE ? "" : selectedPrefecture;
  const genreQuery = selectedGenre === ALL_FILTER_VALUE ? "" : selectedGenre;
  const activeFilters = [
    searchQuery.trim()
      ? {
          key: "search",
          label: `キーワード: ${searchQuery.trim()}`,
          onClear: () => onSearchQueryChange(""),
        }
      : null,
    prefectureQuery
      ? {
          key: "prefecture",
          label: `都道府県: ${prefectureQuery}`,
          onClear: () => onPrefectureChange(ALL_FILTER_VALUE),
        }
      : null,
    genreQuery
      ? {
          key: "genre",
          label: `ジャンル: ${genreQuery}`,
          onClear: () => onGenreChange(ALL_FILTER_VALUE),
        }
      : null,
    internationalOnly
      ? {
          key: "international",
          label: "来日公演",
          onClear: () => onInternationalOnlyChange(false),
        }
      : null,
  ].filter((filter): filter is NonNullable<typeof filter> => Boolean(filter));

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
        <input
          type="search"
          value={prefectureQuery}
          onChange={(event) =>
            onPrefectureChange(event.target.value || ALL_FILTER_VALUE)
          }
          placeholder="例: 東京、神奈川、大阪"
          list="prefecture-filter-options"
        />
        <datalist id="prefecture-filter-options">
          {prefectures.map((prefecture) => (
            <option key={prefecture} value={prefecture}>
              {prefecture}
            </option>
          ))}
        </datalist>
      </label>

      <label className={styles.filterField}>
        <span>ジャンル</span>
        <input
          type="search"
          value={genreQuery}
          onChange={(event) =>
            onGenreChange(event.target.value || ALL_FILTER_VALUE)
          }
          placeholder="例: Metalcore、Hardcore"
          list="genre-filter-options"
        />
        <datalist id="genre-filter-options">
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </datalist>
      </label>

      <label className={styles.filterCheckboxField}>
        <input
          type="checkbox"
          checked={internationalOnly}
          onChange={(event) =>
            onInternationalOnlyChange(event.target.checked)
          }
        />
        <span>来日公演に絞る</span>
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

      {activeFilters.length > 0 && (
        <div className={styles.activeFilters} aria-label="適用中の絞り込み">
          <span>適用中</span>
          <div className={styles.activeFilterChips}>
            {activeFilters.map((filter) => (
              <button
                className={styles.activeFilterChip}
                key={filter.key}
                type="button"
                onClick={filter.onClear}
                aria-label={`${filter.label}を解除`}
              >
                {filter.label}
                <span aria-hidden="true">x</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
