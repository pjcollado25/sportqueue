import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c6f04d",
          borderRadius: 40,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <circle cx="11.5" cy="11.5" r="5.5" fill="none" stroke="#0e3b2e" strokeWidth="2.25" />
          <path d="M15.5 15.5 L23.5 23.5" stroke="#0e3b2e" strokeWidth="2.25" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
