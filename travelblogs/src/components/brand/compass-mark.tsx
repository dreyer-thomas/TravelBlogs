export const compassMarkColors = {
  ring: "#1F6F78",
  needle: "#B34A3C",
  hub: "#2D2A26",
  ground: "#FBF7F1",
} as const;

/** Shared with src/app/icon.svg — keep both in sync when changing the mark. */
export function CompassMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle
        cx="16"
        cy="16"
        r="12.5"
        fill="none"
        stroke={compassMarkColors.ring}
        strokeWidth="2.4"
      />
      <polygon points="16,6.5 19,16 13,16" fill={compassMarkColors.ring} />
      <polygon points="16,25.5 13,16 19,16" fill={compassMarkColors.needle} />
      <circle cx="16" cy="16" r="1.6" fill={compassMarkColors.hub} />
    </svg>
  );
}
