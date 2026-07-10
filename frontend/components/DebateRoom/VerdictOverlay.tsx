"use client";

import type { VerdictData, Vendor } from "./types";
import VendorIcon, { VENDOR_LABEL, VENDOR_COLOR, VENDOR_ICON_COLOR } from "./VendorIcon";

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

          {/* Footer: suggested path + takeaway + back button + stamp */}
          <div
            style={{
              position: "relative",
              marginTop: 14,
              padding: "10px 130px 8px 12px",
              borderTop: "1px solid rgba(46,42,32,0.25)",
              minHeight: 80,
            }}
          >
            {winnerVendor && winnerModel ? (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, letterSpacing: "0.2em", color: "rgba(46,42,32,0.45)", marginBottom: 3 }}>
                  WINNER
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <VendorIcon vendor={winnerVendor} size={11} color={VENDOR_ICON_COLOR[winnerVendor]} />
                  <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 15, color: VENDOR_COLOR[winnerVendor] }}>
                    {winnerModel}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, letterSpacing: "0.14em", color: "rgba(46,42,32,0.4)" }}>
                    · {VENDOR_LABEL[winnerVendor]}
                  </span>
                </div>
              </div>
            ) : verdict.winner === "tie" ? (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em", color: "rgba(46,42,32,0.55)", marginBottom: 6 }}>
                RESULT · TIE
              </div>
            ) : null}
            {verdict.suggested_path && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", color: "var(--mz-judge)" }}>
                SUGGESTED PATH: {verdict.suggested_path.toUpperCase()}
              </div>
            )}
            <button
              onClick={onDismiss}
              style={{
                marginTop: 10,
                fontFamily: "var(--font-mono)",
                fontSize: 8.5,
                letterSpacing: "0.16em",
                background: "none",
                border: "1px solid rgba(46,42,32,0.35)",
                color: "rgba(46,42,32,0.7)",
                padding: "6px 11px",
                cursor: "pointer",
              }}
            >
              BACK TO THE DISCUSSION
            </button>
            {/* Stamp */}
            <div
              style={{
                position: "absolute",
                right: 0,
                bottom: -6,
                mixBlendMode: "multiply",
                animation: "mzStamp 0.55s cubic-bezier(0.2,1.3,0.3,1) both",
              }}
            >
              <svg width="105" height="105" viewBox="0 0 150 150" aria-label="Discussion complete stamp">
                <circle cx="75" cy="75" r="70" fill="none" stroke="#E0512F" strokeWidth="2.5" />
                <circle cx="75" cy="75" r="64" fill="none" stroke="#E0512F" strokeWidth="1" />
                <circle cx="75" cy="75" r="40" fill="none" stroke="#E0512F" strokeWidth="1" />
                <defs><path id="mzring2b" d="M 75 23 a 52 52 0 1 1 -0.01 0" /></defs>
                <text fontFamily="IBM Plex Mono, monospace" fontSize="10" letterSpacing="2" fill="#E0512F">
                  <textPath href="#mzring2b">MUNAZARA · CLASS DISCUSSION · WRAPPED UP</textPath>
                </text>
                <text x="75" y="84" textAnchor="middle" fontFamily="Newsreader, serif" fontSize="36" fontWeight="600" fill="#E0512F">M</text>
                <text x="75" y="102" textAnchor="middle" fontFamily="Noto Naskh Arabic, serif" fontSize="13" fill="#E0512F">مناظرہ</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
