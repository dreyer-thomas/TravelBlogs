import { CompassMark } from "@/components/brand/compass-mark";

export function renderCompassFallback(title: string, description: string) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: "#FBF7F1",
        padding: "0 80px",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 64,
          boxShadow: "0 8px 24px rgba(45,42,38,0.08)",
        }}
      >
        <CompassMark size={180} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            color: "#2D2A26",
            letterSpacing: -2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 30, color: "#6B635B", marginTop: 12 }}>
          {description}
        </div>
      </div>
    </div>
  );
}
