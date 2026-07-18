import type { JudgeConfig } from "./types";
import VendorIcon, { VENDOR_LABEL, VENDOR_ICON_COLOR } from "./VendorIcon";

interface Props {
  judge: JudgeConfig;
  onTakeaway?: () => void;
}

export default function JudgeDeskCard({ judge, onTakeaway }: Props) {
  const iconColor = VENDOR_ICON_COLOR[judge.vendor];

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(255, 246, 228, 0.88)",
        backdropFilter: "blur(var(--glass-blur-lg)) saturate(160%)",
        border: "1px solid rgba(207, 90, 53, 0.3)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-3), var(--shadow-accent), inset 0 1px 0 rgba(255,255,255,0.8)",
        padding: "12px 16px 14px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        {/* Vendor label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.24em",
            color: "var(--accent)",
          }}
        >
          <VendorIcon vendor={judge.vendor} size={10} color={iconColor} />
          THE DESK · {VENDOR_LABEL[judge.vendor]}
        </div>

        {/* Model */}
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            fontSize: 19,
            color: "var(--ink)",
            marginTop: 4,
            lineHeight: 1.1,
          }}
        >
          {judge.model}
        </div>

        {/* Status */}
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--accent)",
            marginTop: 4,
            minHeight: 18,
            fontWeight: 500,
          }}
        >
          {judge.status}
        </div>
      </div>

      {/* Round indicators */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid rgba(207, 90, 53, 0.2)",
        }}
      >
        {judge.rounds.map((r) => {
          const isTakeaway = r.name === "Takeaway";
          const clickable = isTakeaway && r.done && !!onTakeaway;
          return (
            <div
              key={r.label}
              onClick={clickable ? onTakeaway : undefined}
              title={clickable ? "Re-open takeaway" : undefined}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                minWidth: 44,
                cursor: clickable ? "pointer" : "default",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 10,
                  background: r.done
                    ? "var(--accent)"
                    : r.active
                    ? "rgba(207, 90, 53, 0.12)"
                    : "rgba(255,255,255,0.5)",
                  color: r.done ? "#faf8f2" : r.active ? "var(--accent)" : "var(--muted)",
                  border: r.done
                    ? "1.5px solid var(--accent)"
                    : r.active
                    ? "1.5px solid var(--accent)"
                    : "1.5px solid rgba(207, 90, 53, 0.25)",
                  boxShadow: r.active ? "var(--shadow-accent)" : r.done ? "0 2px 8px rgba(207,90,53,0.35)" : "none",
                  animation: r.done ? "mzDotPop 0.45s cubic-bezier(0.2,1.4,0.3,1) both" : undefined,
                  transition: "all 0.2s ease",
                }}
              >
                {r.done ? "✓" : r.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 7,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: r.active || r.done ? "var(--ink-soft)" : "var(--muted)",
                  textDecoration: clickable ? "underline" : undefined,
                  textUnderlineOffset: 2,
                }}
              >
                {r.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
