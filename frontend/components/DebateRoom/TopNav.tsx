interface Props {
  question: string;
  onReset?: () => void;
  totalTokens?: number;
  estimatedCostUsd?: number;
}

export default function TopNav({ question, onReset, totalTokens, estimatedCostUsd }: Props) {
  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "8px 18px",
        padding: "10px clamp(14px, 2.5vw, 30px)",
        borderBottom: "1px solid rgba(139, 94, 60, 0.3)",
        background: "rgba(255,255,255,0.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: 16,
            letterSpacing: "0.18em",
            color: "var(--mz-text)",
          }}
        >
          MUNAZARA
        </span>
        <span
          style={{
            fontFamily: "var(--font-arabic)",
            fontSize: 13,
            color: "rgba(46,42,32,0.5)",
          }}
        >
          مناظرہ
        </span>
      </div>

      <div
        style={{
          flex: "1 1 220px",
          minWidth: 0,
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 13.5,
          color: "rgba(46,42,32,0.7)",
        }}
      >
        On the table ·{" "}
        <span style={{ fontStyle: "normal", opacity: 0.8 }}>{question}</span>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        {totalTokens != null && totalTokens > 0 && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.12em", color: "rgba(46,42,32,0.5)" }}>
            {totalTokens.toLocaleString()} tok · ${estimatedCostUsd!.toFixed(4)}
          </span>
        )}
        {onReset && (
          <button
            onClick={onReset}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              letterSpacing: "0.16em",
              background: "none",
              border: "1px solid rgba(46,42,32,0.3)",
              color: "rgba(46,42,32,0.7)",
              padding: "5px 11px",
              cursor: "pointer",
            }}
          >
            NEW DEBATE
          </button>
        )}
      </div>
    </div>
  );
}
