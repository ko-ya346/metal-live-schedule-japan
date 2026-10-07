import { candidateEvents } from "../src/data/candidate_events.ts";
import { eventUpdateCandidates } from "../src/data/event_update_candidates.ts";
import { publishedEvents } from "../src/data/events.ts";
process.stdout.write(JSON.stringify({ candidateEvents, eventUpdateCandidates, publishedEvents }));
