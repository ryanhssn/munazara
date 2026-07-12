"use client";

import { useState } from "react";
import DebateRoom from "@/components/DebateRoom";
import SetupForm from "@/components/SetupForm";
import { useDebateStream, type DebateConfig } from "@/hooks/useDebateStream";
import { JUDGE_DISPLAY, getRoundName } from "@/lib/models";
import type { DebaterConfig, JudgeConfig } from "@/components/DebateRoom/types";

export default function Page() {
  const { state, start, stop } = useDebateStream();
  const [config, setConfig] = useState<DebateConfig | null>(null);

  const handleStart = (cfg: DebateConfig) => {
    setConfig(cfg);
    start(cfg);
  };

  const handleReset = () => {
    stop();
    setConfig(null);
  };

  // Show setup form when idle or no config yet
  if (!config || state.phase === "idle") {
    return <SetupForm onStart={handleStart} />;
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

  // Build round indicators from maxRounds + current state
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

  return (
    <>
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
      />

      {/* Error banner */}
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
    </>
  );
}
