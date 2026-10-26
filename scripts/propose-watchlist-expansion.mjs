import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { events } from "../src/data/events.ts";
import { discoveryArtistKeywords, priorityArtistKeywords } from "../src/data/watchTargets.ts";

const args = new Map(process.argv.slice(2).map((arg) => {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  return match ? [match[1], match[2]] : [arg.replace(/^--/, ""), "true"];
}));
const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const start = Date.parse(`${today}T00:00:00+09:00`) - 365 * 86400000;
const end = Date.parse(`${today}T00:00:00+09:00`) + 180 * 86400000;
const dateText = (d) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
const normalize = (s) => s.toLocaleLowerCase("ja-JP").replace(/[\s・.．_\-!！?？]/g, "");
const known = new Set([...priorityArtistKeywords, ...discoveryArtistKeywords].map(normalize));
const relevantGenre = /metal|メタル|heavy|ハードロック|hard rock|loud|ラウド|hardcore|ハードコア|punk|パンク/i;
const included = events.filter((e) => e.status === "scheduled" && !e.id.startsWith("sample-") && e.isInternational === false && Date.parse(`${e.date}T00:00:00+09:00`) >= start && Date.parse(`${e.date}T00:00:00+09:00`) <= end && (e.genres ?? []).some((g) => relevantGenre.test(g)) && (e.artists ?? []).length > 1);
const byName = new Map();
for (const e of included) {
  const dedupeKey = [e.date, e.prefecture, e.venue].join("|").toLocaleLowerCase("ja-JP");
  for (const name of e.artists ?? []) {
    if (!name || known.has(normalize(name))) continue;
    const row = byName.get(name) ?? { name, shows: new Map() };
    row.shows.set(dedupeKey, e);
    byName.set(name, row);
  }
}
const pool = [...byName.values()].map((r) => ({ ...r, shows: [...r.shows.values()].sort((a,b) => a.date.localeCompare(b.date)) }));
pool.sort((a,b) => (b.shows.some(e => e.date >= today) - a.shows.some(e => e.date >= today)) || b.shows.length - a.shows.length || (b.shows.at(-1)?.date ?? "").localeCompare(a.shows.at(-1)?.date ?? "") || a.name.localeCompare(b.name, "ja"));
const limit = Number(args.get("limit") ?? 50);
const shown = pool.slice(0, limit);
const lines = [
  `# 国内共演者の探索候補 (${today})`, "",
  "## データからの抽出結果", "",
  "- 選別モデルは使用していません。人間が確認しやすいよう、条件に合うデータを機械的に集計しました。",
  `- 対象イベント: ${included.length}件（isInternational=false、予定公演、前365日〜先180日、メタル／ハードロック／ラウド／ハードコア等のジャンル、共演者2組以上）`,
  "- isInternational=false は国内公演の根拠として扱っています。各共演者の国籍を個別判定した結果ではありません。",
  `- 既存探索語に含まれない共演者: ${pool.length}組。表示: ${shown.length}組、未表示: ${Math.max(0,pool.length-shown.length)}組。`,
  "- 件数は同一日・都道府県・会場の重複イベントをまとめて集計。候補はバンドと断定せず、出演名義として表示しています。", ""
];
if (!shown.length) lines.push("条件に合う候補はありません。", "");
lines.push("## 候補の根拠", "");
for (const item of shown) {
  lines.push(`**${item.name} — ${item.shows.length}公演**`, "");
  for (const e of item.shows.slice(-3).reverse()) {
    lines.push(`- ${e.date} / ${e.prefecture} / ${e.venue} / ID: ${e.id}`);
    lines.push(`  共演: ${(e.artists ?? []).filter(a => a !== item.name).join("、")}`);
    lines.push(`  ジャンル: ${(e.genres ?? []).join("、") || "未記録"}`);
  }
  lines.push("");
}
lines.push("## 人間に確認してほしいこと", "", "- Metal Calendarの探索対象ジャンルに合う出演名義を選んでください。", "- このレポートだけでは個々の出演者の国籍や活動状況を保証しません。", "- この処理は watchTargets.ts や公開イベントを変更しません。", "");
const report = lines.join("\n");
const reportPath = args.get("report");
if (reportPath) await writeFile(reportPath, report, "utf8");
process.stdout.write(report);
const signature = createHash("sha256").update(JSON.stringify(shown.map(x => [x.name, x.shows.map(e => [e.id,e.date])]))).digest("hex");
if (args.get("signature")) await writeFile(args.get("signature"), signature + "\n", "utf8");
