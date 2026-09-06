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
    artistName: "AMORPHIS",
    genre: "Melodic Death Metal / Progressive Metal",
    description:
      "北欧らしいメロディと重さを、フォーク感やプログレッシブな展開で聴かせるバンド。",
    recommendedFor: "激しさだけでなく、歌心や物語性もほしい人に。",
    firstListen: {
      label: "The Bee",
      url: "https://www.youtube.com/results?search_query=AMORPHIS+The+Bee",
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
  {
    artistName: "CARCASS",
    genre: "Death Metal / Grindcore",
    description:
      "デスメタルとグラインドコアを出発点に、鋭いリフと冷たいメロディで聴かせる英国のバンド。",
    recommendedFor: "速さ、重さ、切れ味のあるギターリフを浴びたい人に。",
    firstListen: {
      label: "Heartwork",
      url: "https://www.youtube.com/results?search_query=CARCASS+Heartwork",
    },
  },
  {
    artistName: "BEAST IN BLACK",
    genre: "Power Metal / Heavy Metal",
    description:
      "きらびやかなシンセと大きなサビ、疾走感のあるメタルを押し出すフィンランドのバンド。",
    recommendedFor: "キャッチーで派手なメロディと、ライブ映えする高揚感がほしい人に。",
    firstListen: {
      label: "Blind and Frozen",
      url: "https://www.youtube.com/results?search_query=BEAST+IN+BLACK+Blind+and+Frozen",
    },
  },
];
