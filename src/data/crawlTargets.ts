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
        lastCheckedAt: null,
    },
];
