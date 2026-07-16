"use client";

import { useState } from "react";
import type { DebateRoomProps } from "./types";
import TopNav from "./TopNav";
import ClassroomScene from "./ClassroomScene";
import VerdictOverlay from "./VerdictOverlay";
import DiscussionLog from "./DiscussionLog";

export default function DebateRoom({ question, debaterA, debaterB, judge, verdict, log, onReset, totalTokens, estimatedCostUsd }: DebateRoomProps) {
  const [verdictDismissed, setVerdictDismissed] = useState(false);

  return (
    <div
      style={{
        height: "100vh",
        color: "var(--mz-text)",
        background: "radial-gradient(1200px 700px at 50% -10%, rgba(124,148,115,0.16), rgba(124,148,115,0) 60%), var(--mz-bg)",
        fontFamily: "var(--font-serif)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TopNav question={question} onReset={onReset} totalTokens={totalTokens} estimatedCostUsd={estimatedCostUsd} />

      <div style={{ flex: "1 1 0", display: "flex", minHeight: 0, overflow: "hidden" }}>

        {/* Classroom */}
        <div style={{ flex: "1 1 0", position: "relative", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <ClassroomScene debaterA={debaterA} debaterB={debaterB} judge={judge} onTakeaway={verdict ? () => setVerdictDismissed(false) : undefined} />

          {verdict && !verdictDismissed && (
            <VerdictOverlay
              verdict={verdict}
              debaterAVendor={debaterA.vendor}
              debaterBVendor={debaterB.vendor}
              debaterAModel={debaterA.model}
              debaterBModel={debaterB.model}
              onDismiss={() => setVerdictDismissed(true)}
            />
          )}
        </div>

        {/* Discussion log — right panel */}
        <div style={{
          flexShrink: 0,
          width: "clamp(300px, 26vw, 380px)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          borderLeft: "2px solid rgba(139,94,60,0.35)",
          background: "linear-gradient(rgb(241,234,216), rgb(234,225,201))",
        }}>
          <div style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            padding: "12px 16px 9px",
            borderBottom: "1px solid rgba(139,94,60,0.25)",
          }}>
            <span style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.22em",
              color: "var(--mz-judge)",
            }}>
              DISCUSSION LOG
            </span>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8.5,
              letterSpacing: "0.16em",
              color: "rgba(46,42,32,0.45)",
              marginLeft: "auto",
            }}>
              {log.length} {log.length === 1 ? "ENTRY" : "ENTRIES"}
            </span>
          </div>
          <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <DiscussionLog log={log} vertical />
          </div>
        </div>

      </div>
    </div>
  );
}
