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


function fadeUp(delaySec: number): React.CSSProperties {
  return {
    opacity: 0,
    animation: `mzFadeUp 0.4s ease ${delaySec}s both`,
  };
}

export default function VerdictOverlay({
  verdict,
  debaterAVendor,
  debaterBVendor,
  debaterAModel,
  debaterBModel,
  onDismiss,
}: Props) {
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
          width: "min(560px, 100%)",
          maxHeight: "92%",
          display: "flex",
          flexDirection: "column",
          background: "#FCF8ED",
          border: "1px solid #E0512F",
          boxShadow: "0 40px 90px -30px rgba(46,42,32,0.5)",
          animation: "mzDrop 0.55s ease both",
          color: "#2E2A20",
        }}
      >
        {/* Scrollable body */}
        <div className="mz-scroll" style={{ overflowY: "auto", padding: "18px 22px 22px", boxSizing: "border-box" }}>

          {/* ── TAKEAWAY header ── */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
            ...fadeUp(0.05),
          }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,107,74,0.45)" }} />
            <div style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 700,
              fontSize: 19,
              letterSpacing: "0.18em",
              textIndent: "0.18em",
              color: "#2E2A20",
            }}>
              TAKEAWAY
            </div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,107,74,0.45)" }} />
          </div>

          {/* ── TLDR: recommendation + why ── */}
          <div style={{ ...fadeUp(0.1) }}>
            <p style={{
              margin: "0 0 10px 0",
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: 16,
              lineHeight: 1.6,
              color: "#2E2A20",
            }}>
              {verdict.tldr?.recommendation}
            </p>
            {verdict.tldr?.why && (
              <p style={{
                margin: "0 0 0 0",
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                lineHeight: 1.65,
                color: "rgba(46,42,32,0.75)",
              }}>
                {verdict.tldr.why}
              </p>
            )}
            {verdict.tldr?.what_would_change_this && (
              <div style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 7,
                  letterSpacing: "0.14em",
                  color: "rgba(46,42,32,0.38)",
                  paddingTop: 3,
                  flexShrink: 0,
                }}>
                  FLIP IF
                </span>
                <span style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "rgba(46,42,32,0.58)",
                }}>
                  {verdict.tldr.what_would_change_this}
                </span>
              </div>
            )}
          </div>

          {/* ── AGREEMENTS (secondary audit trail) ── */}
          {verdict.agreements?.length > 0 && (
            <div style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px dotted rgba(46,42,32,0.18)",
              ...fadeUp(0.38),
            }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 7.5,
                letterSpacing: "0.22em",
                color: "var(--mz-agreed)",
                marginBottom: 8,
              }}>
                POINTS OF AGREEMENT
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {verdict.agreements.map((a, i) => (
                  <div key={i} style={{ borderLeft: "2px solid var(--mz-agreed)", paddingLeft: 10 }}>
                    <span style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "#2E2A20",
                    }}>
                      {a}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DISPUTES (secondary audit trail) ── */}
          {verdict.unresolved_disputes?.length > 0 && (
            <div style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px dotted rgba(46,42,32,0.18)",
              ...fadeUp(0.44),
            }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 7.5,
                letterSpacing: "0.22em",
                color: "rgba(46,42,32,0.52)",
                marginBottom: 8,
              }}>
                UNRESOLVED DISPUTES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {verdict.unresolved_disputes.map((d, i) => (
                  <div key={i} style={{
                    background: "rgba(46,42,32,0.03)",
                    border: "1px solid rgba(139,94,60,0.25)",
                    padding: "10px 12px",
                  }}>
                    <div style={{
                      fontFamily: "var(--font-serif)",
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: "#2E2A20",
                      marginBottom: 8,
                    }}>
                      {d.topic}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                      {([
                        { label: "A", color: VENDOR_COLOR[debaterAVendor], text: d.a_position },
                        { label: "B", color: VENDOR_COLOR[debaterBVendor], text: d.b_position },
                      ] as const).map((side) => (
                        <div key={side.label} style={{ flex: 1, borderLeft: `2px solid ${side.color}`, paddingLeft: 8 }}>
                          <div style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 7,
                            letterSpacing: "0.16em",
                            color: side.color,
                            marginBottom: 3,
                          }}>
                            {side.label}
                          </div>
                          <div style={{
                            fontFamily: "var(--font-serif)",
                            fontStyle: "italic",
                            fontSize: 12.5,
                            lineHeight: 1.55,
                            color: "rgba(46,42,32,0.78)",
                          }}>
                            {side.text}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{
                      borderLeft: "2px solid var(--mz-judge)",
                      background: "rgba(224,81,47,0.04)",
                      padding: "6px 9px",
                    }}>
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 7,
                        letterSpacing: "0.14em",
                        color: "var(--mz-judge)",
                        marginRight: 7,
                      }}>
                        RULING
                      </span>
                      <span style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: "#2E2A20",
                      }}>
                        {d.ruling === "debater_a" ? debaterAModel :
                         d.ruling === "debater_b" ? debaterBModel :
                         d.ruling}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FOOTER ── */}
          <div style={{
            position: "relative",
            marginTop: 16,
            paddingTop: 10,
            paddingRight: 130,
            paddingBottom: 8,
            paddingLeft: 12,
            borderTop: "1px solid rgba(46,42,32,0.25)",
            minHeight: 80,
            ...fadeUp(0.5),
          }}>
            {verdict.suggested_path && (
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.06em",
                color: "#E0512F",
                marginBottom: 7,
              }}>
                {verdict.suggested_path.toUpperCase()}
              </div>
            )}

            {winnerVendor && winnerModel ? (
              <div style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 13,
                color: "rgba(46,42,32,0.8)",
                marginBottom: 10,
              }}>
                The takeaway leans toward{" "}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: VENDOR_COLOR[winnerVendor], fontWeight: 600, fontStyle: "normal" }}>
                  <VendorIcon vendor={winnerVendor} size={14} />
                  {winnerModel}
                </span>
                .
              </div>
            ) : verdict.winner === "tie" ? (
              <div style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 13,
                color: "rgba(46,42,32,0.8)",
                marginBottom: 10,
              }}>
                The debate ended in a tie.
              </div>
            ) : null}

            <button
              onClick={onDismiss}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8.5,
                letterSpacing: "0.16em",
                background: "none",
                border: "1px solid rgba(46,42,32,0.35)",
                color: "rgba(46,42,32,0.7)",
                padding: "6px 11px",
                cursor: "pointer",
                transition: "border-color 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#FF6B4A";
                e.currentTarget.style.color = "#E0512F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(46,42,32,0.35)";
                e.currentTarget.style.color = "rgba(46,42,32,0.7)";
              }}
            >
              BACK TO THE DISCUSSION
            </button>

            {/* Stamp */}
            <div style={{
              position: "absolute",
              right: 0,
              bottom: -6,
              mixBlendMode: "multiply",
              opacity: 0,
              animation: "mzStamp 0.55s cubic-bezier(0.2,1.3,0.3,1) 0.5s both",
            }}>
              <svg width="105" height="105" viewBox="0 0 150 150" aria-label="Discussion complete">
                <circle cx="75" cy="75" r="70" fill="none" stroke="#E0512F" strokeWidth="2.5" />
                <circle cx="75" cy="75" r="64" fill="none" stroke="#E0512F" strokeWidth="1" />
                <circle cx="75" cy="75" r="40" fill="none" stroke="#E0512F" strokeWidth="1" />
                <defs>
                  <path id="mzring-verdict" d="M 75 23 a 52 52 0 1 1 -0.01 0" />
                </defs>
                <text fontFamily="IBM Plex Mono, monospace" fontSize="10" letterSpacing="2" fill="#E0512F">
                  <textPath href="#mzring-verdict">MUNAZARA · CLASS DISCUSSION · WRAPPED UP</textPath>
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
