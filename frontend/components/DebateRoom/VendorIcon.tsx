import type { Vendor } from "./types";

interface Props {
  vendor: Vendor;
  size?: number;
  color?: string;
}

export default function VendorIcon({ vendor, size = 9, color = "currentColor" }: Props) {
  if (vendor === "anthropic") {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ color, flexShrink: 0 }}>
        <path d="M50 14 L84 86 H68 L50 44 L32 86 H16 Z" fill="currentColor" />
      </svg>
    );
  }
  if (vendor === "google") {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ color, flexShrink: 0 }}>
        <path
          d="M50 5 C55 33 67 45 95 50 C67 55 55 67 50 95 C45 67 33 55 5 50 C33 45 45 33 50 5 Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  // openai
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ color, flexShrink: 0 }}>
      <g fill="currentColor">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <rect
            key={deg}
            x="44.5" y="7" width="11" height="41" rx="5.5"
            transform={deg ? `rotate(${deg} 50 50)` : undefined}
          />
        ))}
      </g>
    </svg>
  );
}

export const VENDOR_LABEL: Record<Vendor, string> = {
  anthropic: "ANTHROPIC",
  google: "GOOGLE",
  openai: "OPENAI",
};

export const VENDOR_COLOR: Record<Vendor, string> = {
  anthropic: "var(--mz-a)",
  google: "var(--mz-b)",
  openai: "var(--mz-judge)",
};

export const VENDOR_ICON_COLOR: Record<Vendor, string> = {
  anthropic: "rgb(217, 119, 87)",
  google: "rgb(94, 139, 217)",
  openai: "rgb(224, 81, 47)",
};
