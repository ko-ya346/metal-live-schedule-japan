import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "src");
const allowedFiles = new Set([path.join(sourceDir, "utils/eventLinks.ts")]);
const watchedLabels = [
  "詳細 / Details",
  "チケット / Tickets",
  "公式 / Official",
  "セットリスト / Setlist",
  "Xで共有 / Share",
  "来日公演一覧 / Japan tours",
  "イベント一覧へ戻る / All events",
  "アーティスト別にYouTubeで探す / Search YouTube by artist",
];

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const violations = [];

for (const file of await listFiles(sourceDir)) {
  if (allowedFiles.has(file)) {
    continue;
  }

  const content = await readFile(file, "utf8");

  for (const label of watchedLabels) {
    if (content.includes(label)) {
      violations.push(`${path.relative(rootDir, file)}: hardcoded "${label}"`);
    }
  }
}

if (violations.length > 0) {
  console.error("UI copy labels should use eventLinkLabels from src/utils/eventLinks.ts.");
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("UI copy check passed.");
