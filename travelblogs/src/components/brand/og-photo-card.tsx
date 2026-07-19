export function renderPhotoCard({
  imageDataUri,
  title,
  titleFontSize,
  subtitle,
}: {
  imageDataUri: string;
  title: string;
  titleFontSize: number;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    >
      <img
        src={imageDataUri}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px",
          background:
            "linear-gradient(to top, rgba(15,14,12,0.85) 0%, rgba(15,14,12,0.35) 55%, rgba(15,14,12,0) 100%)",
        }}
      >
        <div
          style={{
            fontSize: titleFontSize,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: -1,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.85)",
              marginTop: 8,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
