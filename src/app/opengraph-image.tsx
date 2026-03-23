import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 56,
          background: "radial-gradient(circle at top left, rgba(34,197,94,0.22), transparent 35%), linear-gradient(135deg, #101010 0%, #0f172a 50%, #0b3b35 100%)",
          color: "white",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 88,
            height: 88,
            borderRadius: 24,
            background: "linear-gradient(135deg, #34d399 0%, #22d3ee 100%)",
            color: "#071114",
            fontSize: 40,
            fontWeight: 800,
          }}
        >
          DL
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 24, opacity: 0.8 }}>dashboard-LAB</div>
          <div style={{ fontSize: 64, lineHeight: 1.05, fontWeight: 800, maxWidth: 940 }}>
            Local-first AI workspace for Claude, Codex, and Gemini
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.35, maxWidth: 920, opacity: 0.85 }}>
            Meetings, PRDs, customer replies, daily signals, and execution in one desktop-ready workspace.
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, fontSize: 24, opacity: 0.88 }}>
          <div>Meeting Hub</div>
          <div>Call → PRD</div>
          <div>Signal Writer</div>
        </div>
      </div>
    ),
    size,
  );
}
