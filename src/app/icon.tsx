import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #111111 0%, #0f3b39 100%)",
          color: "white",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 180,
          fontWeight: 800,
          letterSpacing: -8,
        }}
      >
        DL
      </div>
    ),
    size,
  );
}
