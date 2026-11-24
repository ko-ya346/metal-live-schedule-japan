import { readFile, writeFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) throw new Error("Usage: node sanitize-github-mentions.mjs <markdown-file>");

const original = await readFile(file, "utf8");
// Prevent source titles and names such as @COMTEC PORTBASE from becoming GitHub mentions.
// The prefix guard leaves email addresses untouched.
const sanitized = original.replace(
  /(^|[^A-Za-z0-9._%+-])@([A-Za-z0-9_-]{1,39})(?![A-Za-z0-9_-])/g,
  "$1@\u200B$2",
);
if (sanitized !== original) await writeFile(file, sanitized);
