import type { DebaterConfig } from "./types";
import VendorIcon, { VENDOR_LABEL, VENDOR_COLOR, VENDOR_ICON_COLOR } from "./VendorIcon";

interface Props {
  debater: DebaterConfig;
  isActive?: boolean;
}

export default function DebaterCard({ debater, isActive }: Props) {
  const color = VENDOR_COLOR[debater.vendor];
  const iconColor = VENDOR_ICON_COLOR[debater.vendor];
  const pct = Math.round(debater.confidence * 100);

  return (
    <div
      style={{
        width: "100%",
        background: "var(--glass-fill-2)",
        backdropFilter: "blur(var(--glass-blur-lg)) saturate(160%)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-xl)",
        boxShadow: isActive
          ? `0 0 0 2px ${color}, 0 8px 32px ${color}4d, var(--shadow-2)`
          : "var(--shadow-2), var(--inset-highlight)",
        padding: "9px 11px",
        animation: "mzRise 0.4s ease both",
        transition: "box-shadow 0.4s ease",
      }}
    >
      {/* Vendor row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 7.5,
          letterSpacing: "0.16em",
          color,
        }}
      >
        <VendorIcon vendor={debater.vendor} size={9} color={iconColor} />
        {debater.role === "debater_a" ? "DEBATER A" : "DEBATER B"} ·{" "}
        {VENDOR_LABEL[debater.vendor]}
      </div>

      {/* Model name */}
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: 13,
          color: "var(--ink)",
          marginTop: 2,
        }}
      >
        {debater.model}
      </div>

      {/* Confidence bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 6.5,
            letterSpacing: "0.12em",
            color: "var(--muted)",
          }}
        >
          CONF
        </span>
        <span
          style={{
            display: "block",
            flex: "1 1 0",
            height: 3,
            background: "rgba(0,0,0,0.1)",
          }}
        >
          <span
            style={{
              display: "block",
              height: 3,
              background: color,
              width: `${pct}%`,
              transition: "width 0.9s",
            }}
          />
        </span>
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: 8, color }}
        >
          {pct}%
        </span>
      </div>

      {/* Speech */}
      <div
        style={{
          marginTop: 7,
          paddingTop: 7,
          borderTop: "1px dotted var(--glass-border)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 7,
            letterSpacing: "0.16em",
            color,
            marginBottom: 4,
          }}
        >
          ROUND {toRoman(debater.currentRound)} · {debater.currentRoundName.toUpperCase()}
        </div>
        <div
          className="mz-scroll"
          style={{
            maxHeight: isActive ? 160 : 96,
            overflowY: "auto",
            fontFamily: "var(--font-serif)",
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "var(--ink)",
            paddingRight: 3,
            transition: "max-height 0.4s ease",
          }}
        >
          {debater.currentSpeech}
        </div>
      </div>
    </div>
  );
}

function toRoman(n: number): string {
  return ["I", "II", "III", "IV", "V"][n - 1] ?? String(n);
}
