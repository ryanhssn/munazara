"use client";

import type { VerdictData, Vendor, ActionCategory } from "./types";
import VendorIcon, { VENDOR_LABEL, VENDOR_COLOR, VENDOR_ICON_COLOR } from "./VendorIcon";

const ACTION_META: Record<ActionCategory, { label: string; color: string }> = {
  ask_now:        { label: "ASK FOR THIS NOW",   color: "rgb(46,42,32)" },
  worth_pursuing: { label: "WORTH PURSUING",     color: "rgb(168,92,52)" },
  let_go:         { label: "LET GO OF",          color: "rgb(59,110,140)" },
  revisit:        { label: "REVISIT IN 90 DAYS", color: "rgb(224,81,47)" },
};

interface Props {
  verdict: VerdictData;
  debaterAVendor: Vendor;
  debaterBVendor: Vendor;
  debaterAModel: string;
  debaterBModel: string;
  onDismiss?: () => void;
}

export default function VerdictOverlay({
  verdict,
  debaterAVendor,
  debaterBVendor,
  debaterAModel,
  debaterBModel,
  onDismiss,
}: Props) {
  const confPct = Math.round(verdict.confidence * 100);
  const winnerVendor =
    verdict.winner === "debater_a" ? debaterAVendor :
    verdict.winner === "debater_b" ? debaterBVendor :
    null;
  const winnerModel =
    verdict.winner === "debater_a" ? debaterAModel :
    verdict.winner === "debater_b" ? debaterBModel :
    null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(46,42,32,0.4)",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          maxHeight: "90%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(rgb(252,248,237), rgb(243,236,218))",
          border: "1px solid rgba(139,94,60,0.5)",
          boxShadow: "rgba(46,42,32,0.45) 0px 24px 56px -20px",
          animation: "mzRise 0.4s ease both",
        }}
      >
        {/* Top accent — judge gradient */}
        <div style={{ height: 4, background: "linear-gradient(90deg, rgb(255,138,110), rgb(224,81,47))", flexShrink: 0 }} />

        {/* Scrollable body */}
        <div
          className="mz-scroll"
          style={{ overflowY: "auto", padding: "14px 18px 18px" }}
        >
          {/* Header row: judge label + confidence */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "var(--font-mono)",
                  fontSize: 8,
                  letterSpacing: "0.22em",
                  color: "var(--mz-judge)",
                  marginBottom: 3,
                }}
              >
                THE VERDICT
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 600,
                  fontSize: 16,
                  lineHeight: 1.4,
                  color: "var(--mz-text)",
                  maxWidth: 360,
                }}
              >
                {verdict.recommendation}
              </div>
            </div>
            <div style={{ flexShrink: 0, textAlign: "center", paddingLeft: 12 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--mz-judge)", lineHeight: 1 }}>
                {confPct}%
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: "0.14em", color: "rgba(46,42,32,0.5)", marginTop: 2 }}>
                CONFIDENCE
              </div>
            </div>
          </div>

          {/* Action items */}
          {verdict.action_items && verdict.action_items.length > 0 && (
            <div
              style={{
                paddingTop: 10,
                borderTop: "1px dotted rgba(46,42,32,0.2)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {verdict.action_items.map((item, i) => {
                const meta = ACTION_META[item.category];
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "baseline",
                      gap: "4px 12px",
                      borderLeft: `2px solid ${meta.color}`,
                      padding: "4px 0 4px 10px",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.12em", color: meta.color, minWidth: 155 }}>
                      {meta.label}
                    </span>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 12.5, color: "rgba(46,42,32,0.85)", flex: "1 1 180px" }}>
                      {item.content}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(46,42,32,0.55)", marginLeft: "auto" }}>
                      {item.timing}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Agreements */}
          {verdict.agreements.length > 0 && (
            <div style={{ paddingTop: 10, marginTop: 6, borderTop: "1px dotted rgba(46,42,32,0.2)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, letterSpacing: "0.2em", color: "var(--mz-agreed)", marginBottom: 6 }}>
                POINTS OF AGREEMENT
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {verdict.agreements.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, borderLeft: "2px solid var(--mz-agreed)", paddingLeft: 9 }}>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 12.5, lineHeight: 1.5, color: "var(--mz-text)" }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unresolved disputes */}
          {verdict.unresolved_disputes.length > 0 && (
            <div style={{ paddingTop: 10, marginTop: 6, borderTop: "1px dotted rgba(46,42,32,0.2)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, letterSpacing: "0.2em", color: "rgba(46,42,32,0.6)", marginBottom: 6 }}>
                UNRESOLVED DISPUTES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {verdict.unresolved_disputes.map((d, i) => (
                  <div key={i} style={{ background: "rgba(46,42,32,0.04)", border: "1px solid var(--mz-border)", padding: "8px 10px" }}>
                    <div style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 12.5, color: "var(--mz-text)", marginBottom: 6 }}>
                      {d.topic}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      {([
                        { label: "A", color: VENDOR_COLOR[debaterAVendor], vendor: debaterAVendor, text: d.a_position },
                        { label: "B", color: VENDOR_COLOR[debaterBVendor], vendor: debaterBVendor, text: d.b_position },
                      ] as const).map((side) => (
                        <div key={side.label} style={{ flex: 1, borderLeft: `2px solid ${side.color}`, paddingLeft: 7 }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: "0.14em", color: side.color, marginBottom: 2 }}>
                            {side.label}
                          </div>
                          <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 12, lineHeight: 1.5, color: "rgba(46,42,32,0.8)" }}>
                            {side.text}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: "1px dotted rgba(46,42,32,0.2)", paddingTop: 6 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: "0.12em", color: "var(--mz-judge)", marginRight: 6 }}>RULING</span>
                      <span style={{ fontFamily: "var(--font-serif)", fontSize: 12, color: "var(--mz-text)" }}>{d.ruling}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer: suggested path + winner + dismiss */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 14,
              paddingTop: 10,
              borderTop: "1px solid rgba(46,42,32,0.18)",
            }}
          >
            <div style={{ flex: 1 }}>
              {verdict.suggested_path && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.08em", color: "var(--mz-judge)", marginBottom: 5 }}>
                  {verdict.suggested_path}
                </div>
              )}
              {winnerVendor && winnerModel && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 12.5, color: "rgba(46,42,32,0.7)" }}>
                  Stronger case:
                  <VendorIcon vendor={winnerVendor} size={9} color={VENDOR_ICON_COLOR[winnerVendor]} />
                  <span style={{ color: VENDOR_COLOR[winnerVendor], fontWeight: 600, fontStyle: "normal" }}>
                    {winnerModel}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onDismiss}
              style={{
                flexShrink: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                letterSpacing: "0.16em",
                background: "none",
                border: "1px solid rgba(46,42,32,0.35)",
                color: "rgba(46,42,32,0.7)",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              BACK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
