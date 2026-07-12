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
        background: "rgba(46,42,32,0.42)",
        padding: "16px",
        boxSizing: "border-box",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          maxHeight: "92%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(160deg, rgb(252,248,237) 0%, rgb(245,238,220) 100%)",
          border: "1px solid rgba(139,94,60,0.35)",
          boxShadow: "0 32px 72px -20px rgba(46,42,32,0.5)",
          animation: "mzRise 0.45s cubic-bezier(0.2,1,0.3,1) both",
        }}
      >
        {/* Top accent */}
        <div style={{
          height: 3,
          background: "linear-gradient(90deg, rgb(255,155,120), rgb(224,81,47), rgb(185,55,25))",
          flexShrink: 0,
        }} />

        {/* Scrollable body */}
        <div className="mz-scroll" style={{ overflowY: "auto", padding: "20px 22px 22px" }}>

          {/* ── HEADER: label + confidence ── */}
          <div style={{ marginBottom: 18, ...fadeUp(0.05) }}>
            <div style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 8,
            }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8.5,
                letterSpacing: "0.24em",
                color: "var(--mz-judge)",
              }}>
                THE VERDICT
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 26,
                  lineHeight: 1,
                  color: "var(--mz-judge)",
                }}>
                  {confPct}%
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 7,
                  letterSpacing: "0.18em",
                  color: "rgba(46,42,32,0.38)",
                }}>
                  CONFIDENCE
                </span>
              </div>
            </div>

            {/* Animated confidence bar */}
            <div style={{
              height: 2,
              background: "rgba(46,42,32,0.1)",
              overflow: "hidden",
              marginBottom: 16,
            }}>
              <div style={{
                height: "100%",
                width: `${confPct}%`,
                background: "linear-gradient(90deg, rgba(224,81,47,0.45), rgb(224,81,47))",
                transformOrigin: "left center",
                animation: "mzConfBar 1s cubic-bezier(0.4,0,0.2,1) 0.25s both",
              }} />
            </div>

            {/* Full-width recommendation */}
            <p style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: 16,
              lineHeight: 1.65,
              color: "var(--mz-text)",
            }}>
              {verdict.recommendation}
            </p>
          </div>

          {/* ── AGREEMENTS ── */}
          {verdict.agreements.length > 0 && (
            <div style={{
              paddingTop: 14,
              marginTop: 2,
              borderTop: "1px dotted rgba(46,42,32,0.18)",
              ...fadeUp(0.2),
            }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 7.5,
                letterSpacing: "0.22em",
                color: "var(--mz-agreed)",
                marginBottom: 10,
              }}>
                POINTS OF AGREEMENT
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {verdict.agreements.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      borderLeft: "2px solid var(--mz-agreed)",
                      paddingLeft: 10,
                      ...fadeUp(0.25 + i * 0.05),
                    }}
                  >
                    <span style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      color: "var(--mz-text)",
                    }}>
                      {a}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DISPUTES ── */}
          {verdict.unresolved_disputes.length > 0 && (
            <div style={{
              paddingTop: 14,
              marginTop: 8,
              borderTop: "1px dotted rgba(46,42,32,0.18)",
              ...fadeUp(0.34),
            }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 7.5,
                letterSpacing: "0.22em",
                color: "rgba(46,42,32,0.52)",
                marginBottom: 10,
              }}>
                UNRESOLVED DISPUTES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {verdict.unresolved_disputes.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(46,42,32,0.03)",
                      border: "1px solid var(--mz-border)",
                      padding: "10px 12px",
                      ...fadeUp(0.38 + i * 0.07),
                    }}
                  >
                    <div style={{
                      fontFamily: "var(--font-serif)",
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: "var(--mz-text)",
                      marginBottom: 9,
                    }}>
                      {d.topic}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 9 }}>
                      {([
                        { label: "A", color: VENDOR_COLOR[debaterAVendor], vendor: debaterAVendor, text: d.a_position },
                        { label: "B", color: VENDOR_COLOR[debaterBVendor], vendor: debaterBVendor, text: d.b_position },
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
                    {/* Ruling row with judge accent */}
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
                        color: "var(--mz-text)",
                      }}>
                        {d.ruling}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FOOTER ── */}
          <div style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid rgba(46,42,32,0.18)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            ...fadeUp(0.5),
          }}>
            <div>
              {/* Winner */}
              {winnerVendor && winnerModel ? (
                <div style={{ marginBottom: 8 }}>
                  <div style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 7.5,
                    letterSpacing: "0.22em",
                    color: "rgba(46,42,32,0.4)",
                    marginBottom: 4,
                  }}>
                    WINNER
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <VendorIcon vendor={winnerVendor} size={12} color={VENDOR_ICON_COLOR[winnerVendor]} />
                    <span style={{
                      fontFamily: "var(--font-serif)",
                      fontWeight: 700,
                      fontSize: 15,
                      color: VENDOR_COLOR[winnerVendor],
                    }}>
                      {winnerModel}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 7.5,
                      letterSpacing: "0.14em",
                      color: "rgba(46,42,32,0.38)",
                    }}>
                      · {VENDOR_LABEL[winnerVendor]}
                    </span>
                  </div>
                </div>
              ) : verdict.winner === "tie" ? (
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  color: "rgba(46,42,32,0.52)",
                  marginBottom: 8,
                }}>
                  RESULT · TIE
                </div>
              ) : null}

              {verdict.suggested_path && (
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8.5,
                  letterSpacing: "0.08em",
                  color: "var(--mz-judge)",
                  marginBottom: 11,
                }}>
                  SUGGESTED PATH: {verdict.suggested_path.toUpperCase()}
                </div>
              )}

              <button
                onClick={onDismiss}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8.5,
                  letterSpacing: "0.16em",
                  background: "none",
                  border: "1px solid rgba(46,42,32,0.28)",
                  color: "rgba(46,42,32,0.62)",
                  padding: "7px 13px",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = "rgba(46,42,32,0.6)";
                  el.style.color = "rgba(46,42,32,0.9)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = "rgba(46,42,32,0.28)";
                  el.style.color = "rgba(46,42,32,0.62)";
                }}
              >
                BACK TO THE DISCUSSION
              </button>
            </div>

            {/* Stamp */}
            <div style={{
              flexShrink: 0,
              mixBlendMode: "multiply",
              opacity: 0,
              animation: "mzStamp 0.65s cubic-bezier(0.2,1.3,0.3,1) 0.45s both",
            }}>
              <svg width="94" height="94" viewBox="0 0 150 150" aria-label="Discussion complete">
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
