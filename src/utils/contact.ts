export const xProfileUrl = "https://x.com/ko_ya346";

const reportTemplate = [
  "@ko_ya346 掲載希望・修正依頼です。",
  "",
  "アーティスト名:",
  "公演日:",
  "会場:",
  "公式URL:",
  "補足:",
].join("\n");

export const xReportUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
  reportTemplate,
)}`;
