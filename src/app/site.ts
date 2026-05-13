export const siteName = "Metal Live Schedule";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://metal-live-schedule-japan.vercel.app"
).replace(/\/$/, "");

export const siteDescription =
  "日本国内のヘヴィメタル、ラウドロック、メタルコア、ハードコアのライブ予定を日付・地域・ジャンルで探せるイベントカレンダーです。";
