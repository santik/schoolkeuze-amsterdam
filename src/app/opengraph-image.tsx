import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Schoolkeuze Amsterdam";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background:
            "linear-gradient(135deg, #fef3c7 0%, #fed7aa 25%, #e0f2fe 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 20 }}>🧭</div>
        <div
          style={{
            fontSize: 56,
            fontWeight: "bold",
            color: "#312e81",
            textAlign: "center",
          }}
        >
          Schoolkeuze Amsterdam
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#4338ca",
            marginTop: 20,
            textAlign: "center",
          }}
        >
          Vind en vergelijk middelbare scholen
        </div>
      </div>
    ),
    { ...size }
  );
}
