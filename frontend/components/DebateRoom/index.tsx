"use client";

import { useState, useEffect, useRef } from "react";
import type { DebateRoomProps, Vendor } from "./types";
import TopNav from "./TopNav";
import ClassroomScene from "./ClassroomScene";
import VerdictOverlay from "./VerdictOverlay";
import DiscussionLog from "./DiscussionLog";
import FlyingCard from "./FlyingCard";

interface FlyState {
  agent: "debater_a" | "debater_b";
  vendor: Vendor;
  model: string;
  round: number;
  roundName: string;
  confidence: number;
  speech: string;
  fromRect: { left: number; top: number; width: number; height: number };
  destRect: { left: number; top: number; width: number; height: number };
  logIndex: number;
}

export default function DebateRoom({ question, debaterA, debaterB, judge, verdict, log, onReset, totalTokens, estimatedCostUsd, phase, onChallenge, debateStatus, verdictAt, onAcceptVerdict, onChallengeVerdict }: DebateRoomProps) {
  const [verdictDismissed, setVerdictDismissed] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [flyState, setFlyState] = useState<FlyState | null>(null);
  const [flyKey, setFlyKey] = useState(0);

  const debaterACardRef = useRef<HTMLDivElement>(null);
  const debaterBCardRef = useRef<HTMLDivElement>(null);
  const logPanelRef = useRef<HTMLDivElement>(null);
  const lastTurnCountRef = useRef(0);
  const debaterAConfRef = useRef(debaterA.confidence);
  const debaterBConfRef = useRef(debaterB.confidence);
  debaterAConfRef.current = debaterA.confidence;
  debaterBConfRef.current = debaterB.confidence;

  // Track last-seen rects after every render so the fly trigger always has
  // a valid source position even if the card is no longer in the DOM at
  // TURN_COMPLETE time (e.g. when both debaters finish in the same batch).
  type SimpleRect = { left: number; top: number; width: number; height: number };
  const lastARectRef = useRef<SimpleRect | null>(null);
  const lastBRectRef = useRef<SimpleRect | null>(null);

  useEffect(() => {
    if (debaterACardRef.current) {
      const r = debaterACardRef.current.getBoundingClientRect();
      if (r.width > 0) lastARectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    if (debaterBCardRef.current) {
      const r = debaterBCardRef.current.getBoundingClientRect();
      if (r.width > 0) lastBRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
  }); // no deps — runs after every render

  useEffect(() => {
    const turnEntries = log.filter(e => e.type === "turn");
    if (turnEntries.length <= lastTurnCountRef.current) return;
    lastTurnCountRef.current = turnEntries.length;

    const newTurn = turnEntries[turnEntries.length - 1] as Extract<typeof log[0], { type: "turn" }>;
    const fromRect = newTurn.role === "debater_a" ? lastARectRef.current : lastBRectRef.current;

    if (!fromRect || !logPanelRef.current) return;
    const panelRect = logPanelRef.current.getBoundingClientRect();
    const cardWidth = panelRect.width * 0.86;
    const destRect = {
      left: panelRect.left + panelRect.width * 0.07,
      top: Math.max(panelRect.bottom - 220, panelRect.top + panelRect.height * 0.55),
      width: cardWidth,
      height: fromRect.height,
    };

    let logIndex = -1;
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].type === "turn") { logIndex = i; break; }
    }

    const confidence = newTurn.role === "debater_a"
      ? debaterAConfRef.current
      : debaterBConfRef.current;

    setFlyKey(k => k + 1);
    setFlyState({
      agent: newTurn.role,
      vendor: newTurn.vendor as Vendor,
      model: newTurn.model,
      round: newTurn.round,
      roundName: newTurn.roundName,
      confidence,
      speech: newTurn.content,
      fromRect,
      destRect,
      logIndex,
    });
  }, [log]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        height: "100vh",
        color: "var(--ink)",
        background: "var(--bg-gradient)",
        backgroundAttachment: "fixed",
        fontFamily: "var(--font-serif)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TopNav question={question} onReset={onReset} totalTokens={totalTokens} estimatedCostUsd={estimatedCostUsd} />

      {/* Full-bleed content area — classroom fills everything, right panel overlays */}
      <div style={{ flex: "1 1 0", position: "relative", minHeight: 0, overflow: "hidden" }}>

        {/* Classroom — absolute, full width so its bg image bleeds behind the right panel */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          <ClassroomScene
            debaterA={debaterA}
            debaterB={debaterB}
            judge={judge}
            onTakeaway={verdict ? () => setVerdictDismissed(false) : undefined}
            debaterACardRef={debaterACardRef}
            debaterBCardRef={debaterBCardRef}
            hiddenSpeaker={flyState?.agent}
          />
        </div>

        {/* Flying card overlay — animates from debater head to log panel */}
        {flyState && (
          <FlyingCard
            key={flyKey}
            agent={flyState.agent}
            vendor={flyState.vendor}
            model={flyState.model}
            round={flyState.round}
            roundName={flyState.roundName}
            confidence={flyState.confidence}
            speech={flyState.speech}
            fromRect={flyState.fromRect}
            destRect={flyState.destRect}
            onDone={() => setFlyState(null)}
          />
        )}

        {verdict && !verdictDismissed && (
          <VerdictOverlay
            verdict={verdict}
            debaterAVendor={debaterA.vendor}
            debaterBVendor={debaterB.vendor}
            debaterAModel={debaterA.model}
            debaterBModel={debaterB.model}
            onDismiss={() => setVerdictDismissed(true)}
            debateStatus={debateStatus}
            verdictAt={verdictAt}
            onAccept={onAcceptVerdict}
            onChallenge={onChallengeVerdict}
          />
        )}

        {/* Discussion log — overlays right side, classroom visible behind */}
        <div ref={logPanelRef} style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "clamp(300px, 26vw, 380px)",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid rgba(255,255,255,0.4)",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(18px) saturate(120%)",
        }}>
          <div style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px 9px",
            borderBottom: "1px solid rgba(255,255,255,0.35)",
            background: "rgba(255, 252, 242, 0.72)",
            backdropFilter: "blur(20px) saturate(140%)",
          }}>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              💻 AGENT CHATS
            </span>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: "0.16em",
              color: "var(--muted)",
              marginLeft: "auto",
            }}>
              {log.length} {log.length === 1 ? "ENTRY" : "ENTRIES"}
            </span>
          </div>
          <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <DiscussionLog log={log} vertical flyLogIndex={flyState?.logIndex} />
          </div>

          {phase === "done" && onChallenge && (
            <div style={{ flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.3)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, letterSpacing: "0.2em", color: "var(--muted-2)" }}>COUNTER-CHALLENGE</span>
              <textarea
                value={challenge}
                onChange={e => setChallenge(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && challenge.trim()) {
                    e.preventDefault();
                    onChallenge(challenge.trim());
                    setChallenge("");
                  }
                }}
                placeholder="Challenge the verdict…"
                rows={3}
                style={{
                  resize: "none",
                  fontFamily: "var(--font-serif)",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--glass-fill-1)",
                  backdropFilter: "blur(var(--glass-blur-sm)) saturate(160%)",
                  padding: "8px 10px",
                  color: "var(--ink)",
                  outline: "none",
                  minHeight: 64,
                  maxHeight: 100,
                  boxSizing: "border-box",
                  width: "100%",
                }}
              />
              <button
                onClick={() => { if (!challenge.trim()) return; onChallenge(challenge.trim()); setChallenge(""); }}
                disabled={!challenge.trim()}
                style={{
                  alignSelf: "flex-end",
                  fontFamily: "var(--font-mono)",
                  fontSize: 8.5,
                  letterSpacing: "0.18em",
                  padding: "6px 14px",
                  background: challenge.trim() ? "var(--accent-fill)" : "var(--glass-fill-1)",
                  color: challenge.trim() ? "var(--ink)" : "var(--muted)",
                  border: "1px solid var(--accent)",
                  borderRadius: "var(--radius-pill)",
                  cursor: "pointer",
                }}
              >
                SEND
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

