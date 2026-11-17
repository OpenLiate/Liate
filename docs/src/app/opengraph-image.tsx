import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "OpenLiate — Open Source OOP Framework for AI Agents";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          backgroundImage: "radial-gradient(circle at 50% 40%, rgba(240, 96, 42, 0.28) 0%, transparent 60%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Brand Wings Emblem */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "28px",
          }}
        >
          <svg width="72" height="42" viewBox="0 0 100 58" fill="none">
            <path
              d="M50 42C38 30 18 10 10 18C2 26 22 46 34 54C42 59 47 50 50 42C53 50 58 59 66 54C78 46 98 26 90 18C82 10 62 30 50 42Z"
              fill="#ffffff"
            />
          </svg>
        </div>

        {/* Sarvam AI Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 20px",
            borderRadius: "9999px",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            fontSize: "18px",
            fontWeight: 500,
            marginBottom: "32px",
            color: "#e4e4e7",
          }}
        >
          <span>Selected for India&apos;s Sarvam AI Startup Program 2026 🇮🇳</span>
        </div>

        {/* Main H1 Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "#ffffff",
            }}
          >
            Open Source
          </div>
          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "#ffffff",
            }}
          >
            OOP Framework for AI Agents
          </div>
        </div>

        {/* Subline */}
        <div
          style={{
            fontSize: "24px",
            color: "#a1a1aa",
            marginBottom: "36px",
            fontWeight: 400,
          }}
        >
          Where Classes Are AI Agents
        </div>

        {/* Footer Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "10px 24px",
            borderRadius: "12px",
            backgroundColor: "rgba(20, 20, 20, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            fontSize: "18px",
            fontFamily: "monospace",
            color: "#f0602a",
          }}
        >
          <span style={{ color: "#71717a" }}>$</span>
          <span style={{ color: "#e4e4e7" }}>bunx @openliate/liate run agent.json</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
