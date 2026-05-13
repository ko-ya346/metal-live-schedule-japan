export type CrawlTargetType =
    | "promoter"
    | "venue"
    | "band_official"
    | "sns";

export type CrawlTargetPriority = "high" | "medium" | "low";

export type CrawlTarget = {
    id: string;
    name: string;
    type: CrawlTargetType;
    url: string;
    enabled: boolean;
    priority: CrawlTargetPriority;
    notes: string;
    lastCheckedAt: string | null;
};

// Keep targets source-specific. Do not build a generic crawler framework yet.
export const crawlTargets: CrawlTarget[] = [
    {
        id: "creativeman",
        name: "Creativeman Productions",
        type: "promoter",
        url: "https://www.creativeman.co.jp/",
        enabled: true,
        priority: "high",
        notes: "大手プロモーター。まずはアーティストページとイベントページを手動確認する。",
        lastCheckedAt: null,
    },
    {
        id: "udo",
        name: "UDO Artists",
        type: "promoter",
        url: "https://www.udo.jp/",
        enabled: true,
        priority: "high",
        notes: "来日公演や大きめの国内公演の確認に使う。",
        lastCheckedAt: null,
    },
    {
        id: "club-citta",
        name: "Club Citta",
        type: "venue",
        url: "https://clubcitta.co.jp/",
        enabled: true,
        priority: "medium",
        notes: "会場スケジュールから国内メタル公演を見つけるために使う。",
        lastCheckedAt: "2026-05-13",
    },
    {
        id: "smash",
        name: "SMASH",
        type: "promoter",
        url: "https://smash-jpn.com/",
        enabled: true,
        priority: "medium",
        notes: "来日ロック、ラウド系、周辺ジャンルの候補確認に使う。",
        lastCheckedAt: "2026-05-12",
    },
    {
        id: "evp4u",
        name: "EVP4U",
        type: "promoter",
        url: "https://evp.jp/",
        enabled: true,
        priority: "high",
        notes: "Evoken系の来日メタル、国内メタル公演の候補確認に使う。",
        lastCheckedAt: "2026-05-12",
    },
    {
        id: "shinjuku-antiknock",
        name: "SHINJUKU ANTIKNOCK",
        type: "venue",
        url: "https://www.antiknock.net/",
        enabled: true,
        priority: "high",
        notes: "小規模な国内メタル、ハードコア、ラウド系公演を厚めに確認する。",
        lastCheckedAt: "2026-05-13",
    },
];
