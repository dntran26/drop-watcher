import { ImageResponse } from "next/og";

/** App icon drawn in code, so there's no binary asset to maintain. */
export function iconResponse(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ff5c93 0%, #7c3aed 100%)",
          color: "white",
          fontSize: size * 0.56,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        D
      </div>
    ),
    { width: size, height: size },
  );
}
