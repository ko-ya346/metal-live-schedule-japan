import { ImageResponse } from "next/og";
import { events } from "../../../data/events";
import { formatArtists } from "../../../utils/eventLinks";
import { siteName } from "../../site";

type EventImageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const alt = siteName;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

function findEvent(id: string) {
  return events.find((event) => event.id === id);
}

export default async function OpenGraphImage({ params }: EventImageProps) {
  const { id } = await params;
  const event = findEvent(id);
  const artists = event ? formatArtists(event.artists) : siteName;
  const title = event?.tourName ?? "日本のメタルライブ・来日公演カレンダー";
  const meta = event
    ? `${event.date} / ${event.prefecture} / ${event.venue}`
    : "Metals Calendar";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          backgroundColor: "#050505",
          color: "#f2f2ef",
          borderTop: "18px solid #c52727",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              color: "#ff6b6b",
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            EVENT
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div
              style={{
                color: "#ffffff",
                fontSize: 70,
                fontWeight: 900,
                lineHeight: 1.05,
              }}
            >
              {artists}
            </div>
            <div
              style={{
                color: "#d9d9d4",
                fontSize: 34,
                lineHeight: 1.25,
              }}
            >
              {title}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 28,
            alignItems: "flex-end",
            borderTop: "1px solid #383838",
            paddingTop: 24,
            color: "#b9b9b3",
            fontSize: 28,
          }}
        >
          <div>{meta}</div>
          <div
            style={{
              color: "#ffffff",
              fontWeight: 900,
            }}
          >
            {siteName}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
