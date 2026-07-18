"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  question: string;
  onReset?: () => void;
  totalTokens?: number;
  estimatedCostUsd?: number;
}

export default function TopNav({ question, onReset, totalTokens, estimatedCostUsd }: Props) {
  const [flashKey, setFlashKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const prevTokens = useRef(totalTokens);

  useEffect(() => {
    if (totalTokens != null && totalTokens > 0 && totalTokens !== prevTokens.current) {
      prevTokens.current = totalTokens;
      setFlashKey(k => k + 1);
    }
  }, [totalTokens]);

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "0 18px",
        padding: "10px clamp(14px, 2.5vw, 30px)",
        borderBottom: "1px solid var(--glass-border)",
        background: "rgba(255, 252, 242, 0.82)",
        minWidth: 0,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: 16,
            letterSpacing: "0.18em",
            color: "var(--ink)",
          }}
        >
          MUNAZARA
        </span>
        <span
          style={{
            fontFamily: "var(--font-arabic)",
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          مناظرہ
        </span>
      </div>

      {/* Question — single row, button opens modal */}
      <div
        style={{
          flex: "1 1 0",
          minWidth: 0,
          display: "flex",
          alignItems: "baseline",
          gap: 7,
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 13.5,
          color: "var(--ink-soft)",
        }}
      >
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          On the table ·{" "}
          <span style={{ fontStyle: "normal" }}>{question}</span>
        </span>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            flexShrink: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 8.5,
            letterSpacing: "0.1em",
            background: "none",
            border: "none",
            padding: 0,
            color: "var(--muted-2)",
            cursor: "pointer",
            fontStyle: "normal",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          more
        </button>
      </div>

      {/* Question modal */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(46,42,32,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(16px, 4vw, 48px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--glass-fill-3)",
              backdropFilter: "blur(var(--glass-blur-lg)) saturate(160%)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-3)",
              maxWidth: 640,
              width: "100%",
              padding: "24px 28px",
              animation: "mzRise 0.25s ease both",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 600, letterSpacing: "0.22em", color: "var(--accent)", marginBottom: 12 }}>
              ON THE TABLE
            </div>
            <div style={{
              fontFamily: "var(--font-serif)",
              fontSize: 16,
              lineHeight: 1.65,
              color: "var(--ink)",
            }}>
              {question}
            </div>
            <button
              onClick={() => setModalOpen(false)}
              style={{
                marginTop: 20,
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.16em",
                background: "none",
                border: "1px solid var(--ink-soft)",
                borderRadius: "var(--radius-pill)",
                color: "var(--ink-soft)",
                padding: "5px 14px",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Stats + action */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        {totalTokens != null && totalTokens > 0 && (
          <span
            key={flashKey}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "var(--mz-text)",
              animation: flashKey > 0 ? "mzNumFlash 0.7s ease both" : undefined,
              whiteSpace: "nowrap",
            }}
          >
            {totalTokens.toLocaleString()} tokens · ${estimatedCostUsd!.toFixed(4)}
          </span>
        )}
        {onReset && (
          <button
            onClick={onReset}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              letterSpacing: "0.16em",
              background: "var(--accent)",
              border: "1px solid var(--accent-dark)",
              borderRadius: "var(--radius-pill)",
              color: "#faf8f2",
              padding: "5px 14px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(207,90,53,0.35)",
            }}
          >
            NEW DEBATE
          </button>
        )}
      </div>
    </div>
  );
}
