import { ImageResponse } from "next/og";

import { signalWriterCoverQuerySchema } from "@/lib/api/schemas";
import { parseSearchParams } from "@/lib/api/validation";
import type { SignalWriterVisualAccent, SignalWriterVisualMode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIZE = { width: 1080, height: 1350 };

export async function GET(request: Request) {
  const { title, subtitle, badge, footer, source, accent, mode } = parseSearchParams(
    request,
    signalWriterCoverQuerySchema,
  );
  const palette = getPalette(accent);
  const modeLabel = getModeLabel(mode);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `radial-gradient(circle at top left, ${palette.glow} 0%, transparent 32%), linear-gradient(160deg, ${palette.backgroundStart} 0%, ${palette.backgroundEnd} 100%)`,
          color: "#ffffff",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 28,
            borderRadius: 36,
            border: `1px solid ${palette.border}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: palette.pill,
                  color: palette.pillText,
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {badge}
              </div>
              <div
                style={{
                  fontSize: 28,
                  color: "rgba(255,255,255,0.72)",
                  fontWeight: 600,
                }}
              >
                {modeLabel}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 12 }}>
              <div
                style={{
                  fontSize: 84,
                  lineHeight: 1.05,
                  fontWeight: 800,
                  letterSpacing: -2,
                  maxWidth: 860,
                }}
              >
                {title}
              </div>
              <div
                style={{
                  fontSize: 38,
                  lineHeight: 1.3,
                  color: "rgba(255,255,255,0.86)",
                  maxWidth: 860,
                }}
              >
                {subtitle}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 26, color: "rgba(255,255,255,0.65)" }}>dashboard-LAB · Signal Writer</div>
                <div style={{ fontSize: 30, color: "rgba(255,255,255,0.92)", maxWidth: 820 }}>
                  {footer || source}
                </div>
              </div>
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: palette.logo,
                  color: "#081114",
                  fontSize: 52,
                  fontWeight: 800,
                }}
              >
                DL
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
    },
  );
}

function getModeLabel(value: SignalWriterVisualMode) {
  switch (value) {
    case "tool-spotlight":
      return "Tool Spotlight";
    case "trend-brief":
      return "Trend Brief";
    case "opinion-angle":
      return "Opinion Angle";
    default:
      return "News Flash";
  }
}

function getPalette(accent: SignalWriterVisualAccent) {
  switch (accent) {
    case "cyan":
      return {
        backgroundStart: "#0b1220",
        backgroundEnd: "#0d3d42",
        glow: "rgba(34,211,238,0.28)",
        border: "rgba(34,211,238,0.18)",
        pill: "rgba(34,211,238,0.14)",
        pillText: "#cffafe",
        logo: "linear-gradient(135deg, #22d3ee 0%, #67e8f9 100%)",
      };
    case "emerald":
      return {
        backgroundStart: "#08110c",
        backgroundEnd: "#10372b",
        glow: "rgba(16,185,129,0.3)",
        border: "rgba(52,211,153,0.18)",
        pill: "rgba(16,185,129,0.16)",
        pillText: "#d1fae5",
        logo: "linear-gradient(135deg, #34d399 0%, #6ee7b7 100%)",
      };
    case "violet":
      return {
        backgroundStart: "#120d20",
        backgroundEnd: "#32214b",
        glow: "rgba(168,85,247,0.28)",
        border: "rgba(196,181,253,0.18)",
        pill: "rgba(168,85,247,0.16)",
        pillText: "#ede9fe",
        logo: "linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%)",
      };
    case "rose":
      return {
        backgroundStart: "#1a0b11",
        backgroundEnd: "#4a1f2f",
        glow: "rgba(244,63,94,0.26)",
        border: "rgba(251,113,133,0.18)",
        pill: "rgba(251,113,133,0.16)",
        pillText: "#ffe4e6",
        logo: "linear-gradient(135deg, #fb7185 0%, #fda4af 100%)",
      };
    default:
      return {
        backgroundStart: "#17110a",
        backgroundEnd: "#4a2c12",
        glow: "rgba(245,158,11,0.28)",
        border: "rgba(251,191,36,0.18)",
        pill: "rgba(245,158,11,0.16)",
        pillText: "#fef3c7",
        logo: "linear-gradient(135deg, #f59e0b 0%, #fcd34d 100%)",
      };
  }
}
