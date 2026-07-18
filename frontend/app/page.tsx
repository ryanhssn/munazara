"use client";

import { useState, useEffect, useRef } from "react";
import DebateRoom from "@/components/DebateRoom";
import SetupForm from "@/components/SetupForm";
import { useDebateStream, type DebateConfig } from "@/hooks/useDebateStream";
import { JUDGE_DISPLAY, getRoundName } from "@/lib/models";
import type { DebaterConfig, JudgeConfig } from "@/components/DebateRoom/types";
import {
  listDebates,
  upsertDebate,
  acceptDebate,
  challengeDebate,
  type SavedDebate,
  type DebateStatus,
} from "@/lib/debateHistory";
import type { VerdictData, LogEntry, Vendor } from "@/components/DebateRoom/types";

const STATUS_LABEL: Record<DebateStatus, string> = {
  verdict_pending: "PENDING",
  accepted: "CLOSED",
  challenged: "CHALLENGED",
  expired: "CLOSED",
};

const STATUS_COLOR: Record<DebateStatus, string> = {
  verdict_pending: "var(--accent)",
  accepted: "var(--muted)",
  challenged: "var(--accent-blue)",
  expired: "var(--muted)",
};

function formatDate(ts: number): string {
  const diff = Date.now() - ts;
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function HistorySection({ debates, onSelect }: { debates: SavedDebate[]; onSelect: (d: SavedDebate) => void }) {
  if (debates.length === 0) return null;
  return (
    <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid var(--glass-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, var(--glass-border))" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.25em", color: "var(--muted)" }}>
          PAST DEBATES
        </span>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, var(--glass-border))" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {debates.map((debate) => (
          <button
            key={debate.id}
            onClick={() => onSelect(debate)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              width: "100%",
              textAlign: "left",
              background: "var(--glass-fill-1)",
              backdropFilter: "blur(var(--glass-blur-md)) saturate(160%)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-lg)",
              padding: "12px 16px",
              cursor: "pointer",
              transition: "border-color 0.18s, background 0.18s, transform 0.18s, box-shadow 0.18s",
              boxShadow: "var(--shadow-1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--glass-border-accent)";
              e.currentTarget.style.background = "var(--glass-fill-2)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "var(--shadow-2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--glass-border)";
              e.currentTarget.style.background = "var(--glass-fill-1)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "var(--shadow-1)";
            }}
          >
            {/* Row 1: question + date + status */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{
                flex: 1,
                fontFamily: "var(--font-serif)",
                fontSize: 13.5,
                lineHeight: 1.4,
                color: "var(--ink)",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
              }}>
                {debate.question}
              </span>
              <span style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 7.5, letterSpacing: "0.1em", color: "var(--muted-2)" }}>
                {formatDate(debate.createdAt)}
              </span>
              <span style={{
                flexShrink: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 7,
                letterSpacing: "0.1em",
                color: STATUS_COLOR[debate.status],
                border: `1px solid ${STATUS_COLOR[debate.status]}`,
                borderRadius: "var(--radius-pill)",
                padding: "2px 8px",
              }}>
                {STATUS_LABEL[debate.status]}
              </span>
            </div>
            {/* Row 2: tokens · cost · duration */}
            {(debate.totalTokens > 0 || debate.estimatedCostUsd > 0) && (
              <div style={{ display: "flex", gap: 6, fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink-soft)" }}>
                {debate.totalTokens > 0 && (
                  <span>{debate.totalTokens.toLocaleString()} tokens</span>
                )}
                {debate.estimatedCostUsd > 0 && (
                  <><span style={{ color: "var(--muted-2)" }}>·</span><span>${debate.estimatedCostUsd.toFixed(4)}</span></>
                )}
                {debate.verdictAt && debate.createdAt && (
                  <><span style={{ color: "var(--muted-2)" }}>·</span><span>{Math.round((debate.verdictAt - debate.createdAt) / 1000)}s</span></>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  const { state, start, stop, continueDebate } = useDebateStream();
  const [config, setConfig] = useState<DebateConfig | null>(null);
  const [historyDebate, setHistoryDebate] = useState<SavedDebate | null>(null);
  const [debates, setDebates] = useState<SavedDebate[]>([]);

  const createdAtRef = useRef<number>(0);
  const parentIdRef = useRef<string | null>(null);
  const verdictAtRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setDebates(listDebates());
  }, []);

  useEffect(() => {
    if (state.phase === "done" && state.verdict && state.debateId && config) {
      if (verdictAtRef.current == null) {
        verdictAtRef.current = Date.now();
      }
      const saved: SavedDebate = {
        id: state.debateId,
        question: config.question,
        tier: config.tier,
        judgeVendor: config.judgeVendor,
        debaterAVendor: config.debaterAVendor,
        debaterBVendor: config.debaterBVendor,
        maxRounds: config.maxRounds,
        debaterAModel: state.debaterAModel,
        debaterBModel: state.debaterBModel,
        log: state.log,
        rawTranscript: state.rawTranscript,
        verdict: state.verdict,
        status: "verdict_pending",
        createdAt: createdAtRef.current || Date.now(),
        verdictAt: verdictAtRef.current,
        parentId: parentIdRef.current ?? undefined,
        totalTokens: state.totalTokens,
        estimatedCostUsd: state.estimatedCostUsd,
      };
      upsertDebate(saved);
      setDebates(listDebates());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.debateId, state.verdict]);

  const handleStart = (cfg: DebateConfig) => {
    createdAtRef.current = Date.now();
    verdictAtRef.current = undefined;
    parentIdRef.current = null;
    setConfig(cfg);
    start(cfg);
  };

  const handleReset = () => {
    stop();
    setConfig(null);
    setHistoryDebate(null);
    parentIdRef.current = null;
    verdictAtRef.current = undefined;
    setDebates(listDebates());
  };

  const handleChallenge = (challenge: string) => {
    if (!config) return;
    const parentId = state.debateId;
    createdAtRef.current = Date.now();
    verdictAtRef.current = undefined;
    parentIdRef.current = parentId;
    continueDebate(challenge, config, state.rawTranscript);
    if (parentId) {
      challengeDebate(parentId, "pending");
      setDebates(listDebates());
    }
  };

  const handleAcceptVerdict = () => {
    if (!state.debateId) return;
    acceptDebate(state.debateId);
    setDebates(listDebates());
  };

  const handleChallengeVerdict = () => {
    // Dismiss overlay — user uses the COUNTER-CHALLENGE textarea
  };

  // History view — read-only DebateRoom
  if (historyDebate !== null) {
    const hDebaterA: DebaterConfig = {
      role: "debater_a",
      vendor: historyDebate.debaterAVendor as Vendor,
      model: historyDebate.debaterAModel,
      expression: "neutral",
      confidence: 0,
      currentRound: historyDebate.maxRounds,
      currentRoundName: "Complete",
      currentSpeech: "…",
    };
    const hDebaterB: DebaterConfig = {
      role: "debater_b",
      vendor: historyDebate.debaterBVendor as Vendor,
      model: historyDebate.debaterBModel,
      expression: "neutral",
      confidence: 0,
      currentRound: historyDebate.maxRounds,
      currentRoundName: "Complete",
      currentSpeech: "…",
    };
    const hJudge: JudgeConfig = {
      vendor: historyDebate.judgeVendor as Vendor,
      model: JUDGE_DISPLAY[historyDebate.judgeVendor as Vendor][historyDebate.tier as "fast" | "balanced" | "deep"],
      expression: "neutral",
      status: "Verdict delivered",
      rounds: [],
    };
    return (
      <div key="history" style={{ animation: "mzPageIn 0.5s cubic-bezier(0.2,1,0.3,1) both" }}>
        <DebateRoom
          question={historyDebate.question}
          debaterA={hDebaterA}
          debaterB={hDebaterB}
          judge={hJudge}
          verdict={historyDebate.verdict as VerdictData}
          log={historyDebate.log as LogEntry[]}
          onReset={() => setHistoryDebate(null)}
          totalTokens={historyDebate.totalTokens}
          estimatedCostUsd={historyDebate.estimatedCostUsd}
          phase="done"
          debateStatus={historyDebate.status}
        />
      </div>
    );
  }

  // Setup form (+ history section below it)
  if (!config || state.phase === "idle") {
    return (
      <div key="setup" style={{ animation: "mzPageIn 0.5s cubic-bezier(0.2,1,0.3,1) both" }}>
        <SetupForm
          onStart={handleStart}
          historySection={
            <HistorySection debates={debates} onSelect={(d) => setHistoryDebate(d)} />
          }
        />
      </div>
    );
  }

  const roundName = getRoundName(state.currentRound);

  const debaterA: DebaterConfig = {
    role:             "debater_a",
    vendor:           config.debaterAVendor,
    model:            state.debaterAModel || JUDGE_DISPLAY[config.debaterAVendor][config.tier],
    expression:       state.debaterAExpression,
    confidence:       state.debaterAConfidence,
    currentRound:     state.currentRound,
    currentRoundName: roundName,
    currentSpeech:    state.debaterASpeech || "…",
  };

  const debaterB: DebaterConfig = {
    role:             "debater_b",
    vendor:           config.debaterBVendor,
    model:            state.debaterBModel || JUDGE_DISPLAY[config.debaterBVendor][config.tier],
    expression:       state.debaterBExpression,
    confidence:       state.debaterBConfidence,
    currentRound:     state.currentRound,
    currentRoundName: roundName,
    currentSpeech:    state.debaterBSpeech || "…",
  };

  const roundDots = Array.from({ length: config.maxRounds }, (_, i) => ({
    label: (["I", "II", "III", "IV", "V"] as string[])[i] ?? String(i + 1),
    name:  getRoundName(i + 1),
    done:  i + 1 < state.currentRound || state.phase === "judging" || state.phase === "done",
    active: i + 1 === state.currentRound && state.phase === "debating",
  }));
  roundDots.push({
    label:  "✓",
    name:   "Takeaway",
    done:   state.phase === "done",
    active: state.phase === "judging",
  });

  const judge: JudgeConfig = {
    vendor:     config.judgeVendor,
    model:      JUDGE_DISPLAY[config.judgeVendor][config.tier],
    expression: state.judgeExpression,
    status:     state.judgeStatus,
    rounds:     roundDots,
  };

  const savedDebate = state.debateId ? debates.find((d) => d.id === state.debateId) : null;

  return (
    <div key="debate" style={{ animation: "mzPageIn 0.5s cubic-bezier(0.2,1,0.3,1) both" }}>
      <DebateRoom
        question={config.question}
        debaterA={debaterA}
        debaterB={debaterB}
        judge={judge}
        verdict={state.verdict}
        log={state.log}
        onReset={handleReset}
        totalTokens={state.totalTokens}
        estimatedCostUsd={state.estimatedCostUsd}
        phase={state.phase}
        onChallenge={handleChallenge}
        debateStatus={savedDebate?.status ?? (state.phase === "done" ? "verdict_pending" : undefined)}
        verdictAt={savedDebate?.verdictAt ?? verdictAtRef.current}
        onAcceptVerdict={handleAcceptVerdict}
        onChallengeVerdict={handleChallengeVerdict}
      />

      {state.phase === "error" && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgb(183,65,46)",
            color: "#fff",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
            padding: "10px 20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            zIndex: 200,
            display: "flex",
            gap: 16,
            alignItems: "center",
          }}
        >
          <span>ERROR: {state.error}</span>
          <button
            onClick={handleReset}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontFamily: "inherit", fontSize: "inherit", padding: "2px 10px", cursor: "pointer" }}
          >
            RESTART
          </button>
        </div>
      )}
    </div>
  );
}
