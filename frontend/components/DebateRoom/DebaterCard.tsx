import type { DebaterConfig } from "./types";
import VendorIcon, { VENDOR_LABEL, VENDOR_COLOR, VENDOR_ICON_COLOR } from "./VendorIcon";

interface Props {
  debater: DebaterConfig;
}

export default function DebaterCard({ debater }: Props) {
  const color = VENDOR_COLOR[debater.vendor];
  const iconColor = VENDOR_ICON_COLOR[debater.vendor];
  const pct = Math.round(debater.confidence * 100);

  return (
    <div
      style={{
        width: "100%",
        background: "var(--mz-card)",
        borderWidth: "3px 1px 1px",
        borderStyle: "solid",
        borderColor: `${color} var(--mz-border) var(--mz-border)`,
        boxShadow: "rgba(46,42,32,0.35) 0px 14px 30px -16px",
        padding: "9px 11px",
        animation: "mzRise 0.4s ease both",
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
          color: "var(--mz-text)",
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
            color: "rgba(46,42,32,0.55)",
          }}
        >
          CONF
        </span>
        <span
          style={{
            display: "block",
            flex: "1 1 0",
            height: 3,
            background: "rgba(46,42,32,0.15)",
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
          borderTop: "1px dotted rgba(46,42,32,0.2)",
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
            maxHeight: 96,
            overflowY: "auto",
            fontFamily: "var(--font-serif)",
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "var(--mz-text)",
            paddingRight: 3,
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
