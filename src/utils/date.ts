const eventDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "full",
});

export function formatEventDate(date: string) {
  return eventDateFormatter.format(new Date(date));
}
