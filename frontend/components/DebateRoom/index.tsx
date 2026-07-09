"use client";

import { useState, useRef, useCallback } from "react";
import type { DebateRoomProps } from "./types";
import TopNav from "./TopNav";
import ClassroomScene from "./ClassroomScene";
import VerdictOverlay from "./VerdictOverlay";
import DiscussionLog from "./DiscussionLog";

const HANDLE_H = 44;
const DEFAULT_OPEN_H = 280;
const MIN_H = HANDLE_H;
const DRAG_THRESHOLD = 4; // px — below this treat mouseup as click

export default function DebateRoom({ question, debaterA, debaterB, judge, verdict, log, onReset }: DebateRoomProps) {
  const [verdictDismissed, setVerdictDismissed] = useState(false);
  const [logHeight, setLogHeight] = useState(HANDLE_H);
  const isDragging = useRef(false);
  const dragMoved = useRef(0);
  const dragStartY = useRef(0);
  const dragStartH = useRef(HANDLE_H);
  const animating = useRef(false);

  const isOpen = logHeight > HANDLE_H;

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragMoved.current = 0;
    dragStartY.current = e.clientY;
    dragStartH.current = logHeight;
    animating.current = false;

    const onMove = (ev: MouseEvent) => {
      const delta = dragStartY.current - ev.clientY;
      dragMoved.current = Math.abs(delta);
      const maxH = window.innerHeight * 0.75;
      setLogHeight(Math.round(Math.max(MIN_H, Math.min(maxH, dragStartH.current + delta))));
    };

    const onUp = () => {
      if (dragMoved.current < DRAG_THRESHOLD) {
        // treat as click — toggle
        animating.current = true;
        setLogHeight(h => h > HANDLE_H ? HANDLE_H : DEFAULT_OPEN_H);
      }
      isDragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [logHeight]);

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
      <TopNav question={question} onReset={onReset} />

      <div style={{ position: "relative", flex: "1 1 0", display: "flex", flexDirection: "column" }}>
        <ClassroomScene debaterA={debaterA} debaterB={debaterB} judge={judge} />

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

      {/* Discussion log — in-flow panel so scene compresses upward when expanded */}
      {log.length > 0 && (
        <div
          style={{
            flexShrink: 0,
            height: logHeight,
            transition: isDragging.current ? "none" : "height 0.35s cubic-bezier(0.4,0,0.2,1)",
            background: "linear-gradient(rgb(241,234,216), rgb(234,225,201))",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Drag handle strip */}
          <div
            onMouseDown={startDrag}
            style={{
              flexShrink: 0,
              height: 6,
              cursor: "ns-resize",
              background: "rgba(139,94,60,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 32, height: 2, borderRadius: 1, background: "rgba(139,94,60,0.5)" }} />
          </div>

          {/* Header row */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 clamp(14px, 2.5vw, 30px)",
              height: HANDLE_H - 6,
              cursor: "ns-resize",
              userSelect: "none",
            }}
            onMouseDown={startDrag}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 11, letterSpacing: "0.22em", color: "var(--mz-judge)" }}>
                DISCUSSION LOG
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.14em", color: "rgba(46,42,32,0.45)" }}>
                {log.length} {log.length === 1 ? "ENTRY" : "ENTRIES"}
              </span>
            </div>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => {
                animating.current = true;
                setLogHeight(h => h > HANDLE_H ? HANDLE_H : DEFAULT_OPEN_H);
              }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                letterSpacing: "0.18em",
                background: "none",
                border: "1px solid rgba(46,42,32,0.3)",
                color: "rgba(46,42,32,0.65)",
                padding: "5px 12px",
                cursor: "pointer",
              }}
            >
              {isOpen ? "COLLAPSE ↓" : "VIEW DISCUSSION ↑"}
            </button>
          </div>

          {/* Log content */}
          <div style={{ flex: "1 1 0", overflow: "hidden" }}>
            <DiscussionLog log={log} />
          </div>
        </div>
      )}
    </div>
  );
}
