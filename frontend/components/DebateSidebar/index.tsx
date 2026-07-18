"use client";

import type { SavedDebate, DebateStatus } from "@/lib/debateHistory";

interface Props {
  open: boolean;
  onClose: () => void;
  debates: SavedDebate[];
  onSelect: (debate: SavedDebate) => void;
  onNewDebate: () => void;
}

function formatDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const oneDay = 24 * 60 * 60 * 1000;
  if (diff < oneDay) {
    return "Today";
  } else if (diff < 2 * oneDay) {
    return "Yesterday";
  } else {
    const days = Math.floor(diff / oneDay);
    if (days < 7) return `${days} days ago`;
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

const STATUS_LABEL: Record<DebateStatus, string> = {
  verdict_pending: "PENDING",
  accepted: "ACCEPTED",
  challenged: "CHALLENGED",
  expired: "EXPIRED",
};

const STATUS_BG: Record<DebateStatus, string> = {
  verdict_pending: "#E0512F",
  accepted: "rgba(100,130,80,0.8)",
  challenged: "rgba(60,100,160,0.8)",
  expired: "rgba(46,42,32,0.4)",
};

export default function DebateSidebar({ open, onClose, debates, onSelect, onNewDebate }: Props) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 49,
            background: "rgba(46,42,32,0.3)",
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          zIndex: 50,
          background: "#FCF8ED",
          borderRight: "1px solid rgba(139,94,60,0.3)",
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.2,1,0.3,1)",
          boxShadow: open ? "4px 0 24px rgba(46,42,32,0.15)" : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px 10px",
            borderBottom: "1px solid rgba(139,94,60,0.2)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.22em",
              color: "rgba(46,42,32,0.5)",
            }}
          >
            HISTORY
          </span>
          <button
            onClick={onClose}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              background: "none",
              border: "none",
              color: "rgba(46,42,32,0.5)",
              cursor: "pointer",
              padding: "0 2px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* New debate button */}
        <div style={{ flexShrink: 0, padding: "10px 14px 8px" }}>
          <button
            onClick={onNewDebate}
            style={{
              width: "100%",
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              letterSpacing: "0.16em",
              background: "none",
              border: "1px solid rgba(46,42,32,0.3)",
              color: "rgba(46,42,32,0.7)",
              padding: "7px 11px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            + NEW DEBATE
          </button>
        </div>

        {/* Debate list */}
        <div
          className="mz-scroll"
          style={{
            flex: "1 1 0",
            overflowY: "auto",
            padding: "4px 0 12px",
          }}
        >
          {debates.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "rgba(46,42,32,0.38)",
                textAlign: "center",
              }}
            >
              No past debates yet
            </div>
          ) : (
            debates.map((debate) => (
              <button
                key={debate.id}
                onClick={() => onSelect(debate)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid rgba(139,94,60,0.12)",
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,94,60,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "none";
                }}
              >
                {/* Question text */}
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: "#2E2A20",
                    marginBottom: 6,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {debate.question}
                </div>

                {/* Meta row */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 7.5,
                      letterSpacing: "0.1em",
                      color: "rgba(46,42,32,0.4)",
                    }}
                  >
                    {formatDate(debate.createdAt)}
                  </span>

                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 7,
                      letterSpacing: "0.1em",
                      color: "#fff",
                      background: STATUS_BG[debate.status],
                      padding: "2px 5px",
                      borderRadius: 2,
                      flexShrink: 0,
                    }}
                  >
                    {STATUS_LABEL[debate.status]}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
