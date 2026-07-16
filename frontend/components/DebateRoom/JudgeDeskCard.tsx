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
        background: "linear-gradient(rgb(252,248,237), rgb(243,236,218))",
        border: "1px solid rgba(139,94,60,0.5)",
        boxShadow: "rgba(46,42,32,0.4) 0px 16px 34px -18px",
        padding: "0 16px 10px",
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          height: 4,
          background: "linear-gradient(rgb(255,138,110), rgb(224,81,47))",
          margin: "0 -16px 9px",
          opacity: 0.9,
        }}
      />

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
            letterSpacing: "0.24em",
            color: "var(--mz-judge)",
          }}
        >
          <VendorIcon vendor={judge.vendor} size={9} color={iconColor} />
          THE DESK · {VENDOR_LABEL[judge.vendor]}
        </div>

        {/* Model */}
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: 17,
            color: "var(--mz-text)",
            marginTop: 2,
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
            color: "rgba(46,42,32,0.75)",
            marginTop: 3,
            minHeight: 16,
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
          gap: 16,
          marginTop: 9,
          paddingTop: 8,
          borderTop: "1px solid rgba(139,94,60,0.3)",
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
                gap: 3,
                minWidth: 38,
                cursor: clickable ? "pointer" : "default",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  fontSize: 9,
                  background: r.active ? "var(--mz-card)" : "transparent",
                  color: r.active || r.done ? "var(--mz-text)" : "rgba(46,42,32,0.5)",
                  border: r.active
                    ? "1px solid rgb(255,107,74)"
                    : clickable
                    ? "1px solid rgba(224,81,47,0.6)"
                    : "1px solid rgba(46,42,32,0.3)",
                  boxShadow: r.active
                    ? "rgba(255,107,74,0.22) 0px 0px 0px 3px"
                    : clickable
                    ? "rgba(224,81,47,0.18) 0px 0px 0px 3px"
                    : "none",
                  animation: r.done ? "mzDotPop 0.45s cubic-bezier(0.2,1.4,0.3,1) both" : undefined,
                  transition: "box-shadow 0.15s ease, border-color 0.15s ease",
                }}
              >
                {r.done ? "✓" : r.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 6.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: r.active || r.done ? "var(--mz-text)" : "rgba(46,42,32,0.5)",
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
