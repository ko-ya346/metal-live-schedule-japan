import { readFile, writeFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) throw new Error("Usage: node sanitize-github-mentions.mjs <markdown-file>");

const original = await readFile(file, "utf8");
// Replace every ASCII at-sign in generated Markdown, not only username-shaped values.
// This also prevents an address such as person@COMTEC from triggering a notification.
const sanitized = original.replaceAll("@", "＠");
if (sanitized !== original) await writeFile(file, sanitized);
