import { readFile } from "node:fs/promises";

const files = process.argv.slice(2);
if (files.length === 0) throw new Error("Usage: check-github-mentions.mjs <markdown-file> [...]");

let failed = false;
for (const file of files) {
  const body = await readFile(file, "utf8");
  if (body.includes("@")) {
    console.error("Blocked push: " + file + " still contains an ASCII at-sign.");
    failed = true;
  }
}
if (failed) {
  console.error("Replace raw at-signs with the safe full-width form before pushing.");
  process.exitCode = 1;
}
