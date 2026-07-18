"use client";

import { useState, useEffect } from "react";
import type { VerdictData, Vendor } from "./types";
import VendorIcon, { VENDOR_LABEL, VENDOR_COLOR, VENDOR_ICON_COLOR } from "./VendorIcon";
import { AUTO_ACCEPT_MS } from "@/lib/debateHistory";

interface Props {
  verdict: VerdictData;
  debaterAVendor: Vendor;
  debaterBVendor: Vendor;
  debaterAModel: string;
  debaterBModel: string;
  onDismiss?: () => void;
  debateStatus?: "verdict_pending" | "accepted" | "challenged" | "expired";
  verdictAt?: number;
  onAccept?: () => void;
  onChallenge?: () => void;
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
  debateStatus,
  verdictAt,
  onAccept,
  onChallenge,
}: Props) {
  const [secsLeft, setSecsLeft] = useState(() =>
    verdictAt != null ? Math.max(0, Math.ceil((AUTO_ACCEPT_MS - (Date.now() - verdictAt)) / 1000)) : 0
  );

  useEffect(() => {
    if (debateStatus !== "verdict_pending" || secsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onAccept?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [debateStatus, secsLeft, onAccept]);

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
        background: "rgba(30,26,20,0.62)",
        backdropFilter: "blur(8px)",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "min(680px, 100%)",
          maxHeight: "92%",
          display: "flex",
          flexDirection: "column",
          background: "rgba(255, 246, 228, 0.82)",
          backdropFilter: "blur(var(--glass-blur-lg)) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.7)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 32px 80px rgba(20,16,10,0.5), 0 0 0 1px rgba(207,90,53,0.25), var(--inset-highlight)",
          animation: "mzDrop 0.55s ease both",
          color: "var(--ink)",
        }}
      >
        {/* Scrollable body */}
        <div className="mz-scroll" style={{ overflowY: "auto", padding: "18px 22px 22px", boxSizing: "border-box" }}>

          {/* ── TAKEAWAY header ── */}
          <div style={{
            margin: "-18px -22px 18px",
            padding: "16px 22px 14px",
            background: "rgba(207, 90, 53, 0.08)",
            borderBottom: "1px solid var(--glass-border-accent)",
            borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            ...fadeUp(0.05),
          }}>
            <div style={{ flex: 1, height: 1, background: "var(--glass-border-accent)" }} />
            <div style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: "0.22em",
              textIndent: "0.22em",
              color: "var(--accent)",
            }}>
              TAKEAWAY
            </div>
            <div style={{ flex: 1, height: 1, background: "var(--glass-border-accent)" }} />
          </div>

          {/* ── TLDR: recommendation + why ── */}
          <div style={{ ...fadeUp(0.1) }}>
            <p style={{
              margin: "0 0 10px 0",
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--ink)",
            }}>
              {verdict.tldr?.recommendation}
            </p>
            {verdict.tldr?.why && (
              <p style={{
                margin: "0 0 0 0",
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--ink-soft)",
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
                  color: "var(--muted-3)",
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
                  color: "var(--muted)",
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
              borderTop: "1px dotted var(--glass-border)",
              ...fadeUp(0.38),
            }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 7.5,
                letterSpacing: "0.22em",
                color: "var(--accent-green)",
                marginBottom: 8,
              }}>
                POINTS OF AGREEMENT
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {verdict.agreements.map((a, i) => (
                  <div key={i} style={{ borderLeft: "2px solid var(--accent-green)", paddingLeft: 10 }}>
                    <span style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "var(--ink)",
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
              borderTop: "1px dotted var(--glass-border)",
              ...fadeUp(0.44),
            }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 7.5,
                letterSpacing: "0.22em",
                color: "var(--muted)",
                marginBottom: 8,
              }}>
                UNRESOLVED DISPUTES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {verdict.unresolved_disputes.map((d, i) => (
                  <div key={i} style={{
                    background: "var(--glass-fill-1)",
                    backdropFilter: "blur(var(--glass-blur-sm)) saturate(160%)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 12px",
                  }}>
                    <div style={{
                      fontFamily: "var(--font-serif)",
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: "var(--ink)",
                      marginBottom: 8,
                    }}>
                      {d.topic}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                      {([
                        { label: VENDOR_LABEL[debaterAVendor], color: VENDOR_COLOR[debaterAVendor], text: d.a_position },
                        { label: VENDOR_LABEL[debaterBVendor], color: VENDOR_COLOR[debaterBVendor], text: d.b_position },
                      ]).map((side) => (
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
                            color: "var(--ink-soft)",
                          }}>
                            {side.text}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{
                      borderLeft: "2px solid var(--accent)",
                      background: "var(--accent-tint)",
                      borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                      padding: "6px 9px",
                    }}>
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 7,
                        letterSpacing: "0.14em",
                        color: "var(--accent)",
                        marginRight: 7,
                      }}>
                        RULING
                      </span>
                      <span style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: "var(--ink)",
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
            borderTop: "1px solid var(--glass-border)",
            minHeight: 80,
            ...fadeUp(0.5),
          }}>
            {verdict.suggested_path && (
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.06em",
                color: "var(--accent)",
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
                color: "var(--ink-soft)",
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
                color: "var(--ink-soft)",
                marginBottom: 10,
              }}>
                The debate ended in a tie.
              </div>
            ) : null}

            {debateStatus === "verdict_pending" && secsLeft > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { onAccept?.(); onDismiss?.(); }}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 8.5,
                      letterSpacing: "0.16em",
                      background: "var(--ink)",
                      border: "1px solid var(--ink)",
                      color: "#faf8f2",
                      padding: "6px 11px",
                      borderRadius: "var(--radius-pill)",
                      cursor: "pointer",
                    }}
                  >
                    ACCEPT VERDICT
                  </button>
                  <button
                    onClick={() => { onChallenge?.(); onDismiss?.(); }}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 8.5,
                      letterSpacing: "0.16em",
                      background: "none",
                      border: "1px solid var(--accent)",
                      color: "var(--accent)",
                      padding: "6px 11px",
                      borderRadius: "var(--radius-pill)",
                      cursor: "pointer",
                    }}
                  >
                    CHALLENGE
                  </button>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 7.5,
                    letterSpacing: "0.1em",
                    color: "var(--muted-2)",
                  }}
                >
                  auto-accepted in {secsLeft}s
                </div>
              </div>
            ) : (
              <button
                onClick={onDismiss}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8.5,
                  letterSpacing: "0.16em",
                  background: "none",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-pill)",
                  color: "var(--muted)",
                  padding: "6px 11px",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--glass-border)";
                  e.currentTarget.style.color = "var(--muted)";
                }}
              >
                BACK TO THE DISCUSSION
              </button>
            )}

            {/* Stamp */}
            <div style={{
              position: "absolute",
              right: 0,
              bottom: -6,
              mixBlendMode: "multiply",
              opacity: 0,
              animation: "mzStamp 0.55s cubic-bezier(0.2,1.3,0.3,1) 0.5s both",
              color: "var(--accent)",
            }}>
              <svg width="105" height="105" viewBox="0 0 150 150" aria-label="Discussion complete">
                <circle cx="75" cy="75" r="70" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="75" cy="75" r="64" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="75" cy="75" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
                <defs>
                  <path id="mzring-verdict" d="M 75 23 a 52 52 0 1 1 -0.01 0" />
                </defs>
                <text fontFamily="IBM Plex Mono, monospace" fontSize="10" letterSpacing="2" fill="currentColor">
                  <textPath href="#mzring-verdict">MUNAZARA · CLASS DISCUSSION · WRAPPED UP</textPath>
                </text>
                <text x="75" y="84" textAnchor="middle" fontFamily="Newsreader, serif" fontSize="36" fontWeight="600" fill="currentColor">M</text>
                <text x="75" y="102" textAnchor="middle" fontFamily="Noto Naskh Arabic, serif" fontSize="13" fill="currentColor">مناظرہ</text>
              </svg>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
