export type DiscoveryPick = {
  artistName: string;
  genre: string;
  description: string;
  recommendedFor: string;
  firstListen: {
    label: string;
    url: string;
  };
};

export const discoveryPicks: DiscoveryPick[] = [
  {
    artistName: "MICHAEL SCHENKER GROUP",
    genre: "Hard Rock / Heavy Metal",
    description:
      "叙情的で歌うようなギターと王道ハードロックの熱量を味わえる、レジェンド級のプロジェクト。",
    recommendedFor: "ギター主役のハードロックや、クラシックなメタルの高揚感が好きな人に。",
    firstListen: {
      label: "Armed and Ready",
      url: "https://www.youtube.com/results?search_query=MICHAEL+SCHENKER+GROUP+Armed+and+Ready",
    },
  },
  {
    artistName: "STRATOVARIUS",
    genre: "Power Metal",
    description:
      "透明感のあるメロディ、疾走するリズム、シンフォニックな広がりが魅力の北欧パワーメタル代表格。",
    recommendedFor: "明るくドラマチックなメロディと、伸びやかなサビを求める人に。",
    firstListen: {
      label: "Hunting High and Low",
      url: "https://www.youtube.com/results?search_query=STRATOVARIUS+Hunting+High+and+Low",
    },
  },
  {
    artistName: "POWERWOLF",
    genre: "Power Metal / Heavy Metal",
    description:
      "荘厳なコーラス、分かりやすいサビ、ライブで映える演出を武器にするドイツのパワーメタルバンド。",
    recommendedFor: "初見でも乗りやすいメタル、合唱できるサビ、祝祭感のあるライブが好きな人に。",
    firstListen: {
      label: "We Drink Your Blood",
      url: "https://www.youtube.com/results?search_query=POWERWOLF+We+Drink+Your+Blood",
    },
  },
  {
    artistName: "LOVEBITES",
    genre: "Power Metal / Heavy Metal",
    description:
      "疾走するツインギターと力強いボーカルで、王道ヘヴィメタルの高揚感を鳴らす日本のバンド。",
    recommendedFor: "速い曲、熱いギターソロ、明るい昂揚感が好きな人に。",
    firstListen: {
      label: "When Destinies Align",
      url: "https://www.youtube.com/results?search_query=LOVEBITES+When+Destinies+Align",
    },
  },
];
