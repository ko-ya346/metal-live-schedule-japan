import styles from "./page.module.css";

type EventFiltersProps = {
  internationalOnly: boolean;
  searchQuery: string;
  onInternationalOnlyChange: (internationalOnly: boolean) => void;
  onSearchQueryChange: (query: string) => void;
};

export function EventFilters({
  internationalOnly,
  searchQuery,
  onInternationalOnlyChange,
  onSearchQueryChange,
}: EventFiltersProps) {
  const activeFilters = [
    searchQuery.trim()
      ? {
          key: "search",
          label: `検索: ${searchQuery.trim()}`,
          onClear: () => onSearchQueryChange(""),
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
        <span>イベント検索</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="アーティスト、会場、地域、ジャンルなど"
        />
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
