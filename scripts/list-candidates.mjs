import { candidateEvents } from "../src/data/candidates.ts";

const statusArg = process.argv.find((arg) => arg.startsWith("--status="));
const selectedStatus = statusArg?.replace("--status=", "");

const candidates = selectedStatus
  ? candidateEvents.filter((candidate) => candidate.reviewStatus === selectedStatus)
  : candidateEvents;

if (candidates.length === 0) {
  console.log("No candidate events found.");
  process.exit(0);
}

for (const candidate of candidates) {
  const artists = candidate.artists.join(" / ");
  const date = candidate.date ?? "date unknown";
  const place = [candidate.prefecture, candidate.venue].filter(Boolean).join(" / ");

  console.log(
    [
      candidate.id,
      `[${candidate.reviewStatus}]`,
      artists,
      date,
      place || "place unknown",
      candidate.sourceUrl,
    ].join(" | "),
  );
}
