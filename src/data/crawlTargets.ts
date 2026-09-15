export type CrawlTargetType =
    | "promoter"
    | "venue"
    | "band_official"
    | "ticket"
    | "sns";

export type CrawlTargetPriority = "high" | "medium" | "low";
export type CrawlTargetRegion =
    | "kanto"
    | "kansai"
    | "tokai"
    | "other"
    | "nationwide";

export type CrawlTarget = {
    id: string;
    name: string;
    type: CrawlTargetType;
    url: string;
    region: CrawlTargetRegion;
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
        region: "nationwide",
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
        region: "nationwide",
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
        region: "kanto",
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
        region: "nationwide",
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
        region: "nationwide",
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
        region: "kanto",
        enabled: true,
        priority: "high",
        notes: "小規模な国内メタル、ハードコア、ラウド系公演を厚めに確認する。",
        lastCheckedAt: "2026-05-13",
    },
    {
        id: "zirco-tokyo",
        name: "Zirco Tokyo",
        type: "venue",
        url: "https://zirco-tokyo.jp/",
        region: "kanto",
        enabled: true,
        priority: "medium",
        notes: "新宿の小規模ラウド系、ロックアイドル、周辺ジャンル公演の候補確認に使う。",
        lastCheckedAt: "2026-05-14",
    },
    {
        id: "otsuka-deepa",
        name: "大塚Deepa",
        type: "venue",
        url: "https://otsukadeepa.jp/",
        region: "kanto",
        enabled: true,
        priority: "medium",
        notes: "大塚の小規模ラウド系、ハードコア、ロック寄り公演の候補確認に使う。",
        lastCheckedAt: "2026-05-14",
    },
    {
        id: "eplus-osaka-metal-core",
        name: "eplus 大阪府 メタル・ハードコア",
        type: "ticket",
        url: "https://eplus.jp/sf/live/metal-core/osaka",
        region: "kansai",
        enabled: true,
        priority: "high",
        notes: "大阪ページの検索需要があるため、関西候補の主な入口として厚めに確認する。",
        lastCheckedAt: null,
    },
    {
        id: "eplus-kyoto-metal-core",
        name: "eplus 京都府 メタル・ハードコア",
        type: "ticket",
        url: "https://eplus.jp/sf/live/metal-core/kyoto",
        region: "kansai",
        enabled: true,
        priority: "medium",
        notes: "京都のメタル・ハードコア候補を拾う。",
        lastCheckedAt: null,
    },
    {
        id: "eplus-hyogo-metal-core",
        name: "eplus 兵庫県 メタル・ハードコア",
        type: "ticket",
        url: "https://eplus.jp/sf/live/metal-core/hyogo",
        region: "kansai",
        enabled: true,
        priority: "medium",
        notes: "神戸周辺のメタル・ハードコア候補を拾う。",
        lastCheckedAt: null,
    },
    {
        id: "socore-factory",
        name: "SOCORE FACTORY",
        type: "venue",
        url: "https://socorefactory.com/schedule/",
        region: "kansai",
        enabled: true,
        priority: "high",
        notes: "大阪の小箱、海外ハードコア/パンク/メタル寄り来日公演を拾う。",
        lastCheckedAt: null,
    },
    {
        id: "shinsaibashi-clapper",
        name: "心斎橋CLAPPER",
        type: "venue",
        url: "https://club-clapper.com/schedule/",
        region: "kansai",
        enabled: true,
        priority: "medium",
        notes: "大阪のメタル、ラウド、ハードコア系小規模公演を拾う。",
        lastCheckedAt: null,
    },
    {
        id: "bigcat",
        name: "BIGCAT",
        type: "venue",
        url: "https://bigcat-live.com/schedule",
        region: "kansai",
        enabled: true,
        priority: "medium",
        notes: "大阪の中規模ロック/メタル公演を拾う。",
        lastCheckedAt: null,
    },
    {
        id: "eplus-aichi-metal-core",
        name: "eplus 愛知県 メタル・ハードコア",
        type: "ticket",
        url: "https://eplus.jp/sf/live/metal-core/aichi",
        region: "tokai",
        enabled: true,
        priority: "high",
        notes: "名古屋近辺のメタル・ハードコア候補を拾う。",
        lastCheckedAt: null,
    },
    {
        id: "eplus-tokyo-metal-core",
        name: "eplus 東京都 メタル・ハードコア",
        type: "ticket",
        url: "https://eplus.jp/sf/live/metal-core/tokyo",
        region: "kanto",
        enabled: true,
        priority: "high",
        notes: "関東首都圏の取りこぼし確認に使う。",
        lastCheckedAt: null,
    },
];
