"use client";

import { useReducer, useCallback, useRef } from "react";
import type { ExpressionState } from "@/lib/sceneAssets";
import type { VerdictData, Vendor, LogEntry } from "@/components/DebateRoom/types";
import { getRoundName, JUDGE_DISPLAY } from "@/lib/models";

export interface DebateConfig {
  question: string;
  tier: "fast" | "balanced" | "deep";
  maxRounds: number;
  judgeVendor: Vendor;
  debaterAVendor: Vendor;
  debaterBVendor: Vendor;
}

export interface StreamState {
  phase: "idle" | "debating" | "judging" | "done" | "error";
  currentRound: number;
  maxRounds: number;
  debaterASpeech: string;
  debaterBSpeech: string;
  debaterAExpression: ExpressionState;
  debaterBExpression: ExpressionState;
  debaterAConfidence: number;
  debaterBConfidence: number;
  judgeExpression: ExpressionState;
  judgeStatus: string;
  verdict: VerdictData | null;
  error: string | null;
  log: LogEntry[];
  debaterAModel: string;
  debaterBModel: string;
  totalTokens: number;
  estimatedCostUsd: number;
}

type Action =
  | { type: "RESET"; maxRounds: number; debaterAModel: string; debaterBModel: string }
  | { type: "DONE_WITH_STATS"; totalTokens: number; estimatedCostUsd: number }
  | { type: "ROUND_START"; round: number }
  | { type: "TOKEN"; agent: string; text: string }
  | { type: "TURN_COMPLETE"; agent: string; confidence: number; disputes: unknown[]; totalTokens: number; estimatedCostUsd: number }
  | { type: "CONVERGENCE"; converged: boolean }
  | { type: "JUDGE_START" }
  | { type: "VERDICT"; verdict: VerdictData }
  | { type: "ERROR"; message: string }
  | { type: "DONE" };

const INIT: StreamState = {
  phase: "idle",
  currentRound: 1,
  maxRounds: 3,
  debaterASpeech: "",
  debaterBSpeech: "",
  debaterAExpression: "neutral",
  debaterBExpression: "neutral",
  debaterAConfidence: 0,
  debaterBConfidence: 0,
  judgeExpression: "neutral",
  judgeStatus: "Awaiting debate",
  verdict: null,
  error: null,
  log: [],
  debaterAModel: "",
  debaterBModel: "",
  totalTokens: 0,
  estimatedCostUsd: 0,
};

function reducer(s: StreamState, a: Action): StreamState {
  switch (a.type) {
    case "RESET":
      return { ...INIT, phase: "debating", maxRounds: a.maxRounds, judgeStatus: "Round 1 underway", debaterAModel: a.debaterAModel, debaterBModel: a.debaterBModel };

    case "ROUND_START":
      return {
        ...s,
        currentRound: a.round,
        debaterASpeech: "",
        debaterBSpeech: "",
        debaterAExpression: "thinking",
        debaterBExpression: "listening",
        judgeExpression: "listening",
        judgeStatus: `Round ${a.round} underway`,
      };

    case "TOKEN":
      if (a.agent === "debater_a")
        return { ...s, debaterASpeech: s.debaterASpeech + a.text, debaterAExpression: "speaking", debaterBExpression: "listening" };
      if (a.agent === "debater_b")
        return { ...s, debaterBSpeech: s.debaterBSpeech + a.text, debaterBExpression: "speaking", debaterAExpression: "listening" };
      if (a.agent === "judge")
        return { ...s, judgeExpression: "speaking", debaterAExpression: "listening", debaterBExpression: "listening" };
      return s;

    case "TURN_COMPLETE": {
      const isA = a.agent === "debater_a";
      const speech = isA ? s.debaterASpeech : s.debaterBSpeech;
      const model = isA ? s.debaterAModel : s.debaterBModel;
      const title = speech.split(/[.!?]/)[0]?.trim().slice(0, 72) || speech.slice(0, 72);
      const entry: LogEntry = {
        type: "turn",
        role: a.agent as "debater_a" | "debater_b",
        round: s.currentRound,
        roundName: getRoundName(s.currentRound),
        model,
        title,
        content: speech,
      };
      if (isA)
        return { ...s, debaterAConfidence: a.confidence, debaterAExpression: a.disputes.length > 0 ? "disagreeing" : "agreeing", debaterBExpression: "thinking", log: [...s.log, entry], totalTokens: a.totalTokens, estimatedCostUsd: a.estimatedCostUsd };
      if (a.agent === "debater_b")
        return { ...s, debaterBConfidence: a.confidence, debaterBExpression: a.disputes.length > 0 ? "disagreeing" : "agreeing", debaterAExpression: "thinking", log: [...s.log, entry], totalTokens: a.totalTokens, estimatedCostUsd: a.estimatedCostUsd };
      return s;
    }

    case "CONVERGENCE":
      return {
        ...s,
        debaterAExpression: a.converged ? "agreeing" : "disagreeing",
        debaterBExpression: a.converged ? "agreeing" : "disagreeing",
        judgeExpression: "thinking",
      };

    case "JUDGE_START":
      return {
        ...s,
        phase: "judging",
        judgeExpression: "thinking",
        debaterAExpression: "listening",
        debaterBExpression: "listening",
        judgeStatus: "Deliberating...",
      };

    case "VERDICT":
      return {
        ...s,
        phase: "done",
        verdict: a.verdict,
        judgeExpression: "victorious",
        debaterAExpression: a.verdict.winner === "debater_a" ? "victorious" : a.verdict.winner === "tie" ? "victorious" : "disappointed",
        debaterBExpression: a.verdict.winner === "debater_b" ? "victorious" : a.verdict.winner === "tie" ? "victorious" : "disappointed",
        judgeStatus: "Verdict delivered",
      };

    case "ERROR":
      return { ...s, phase: "error", error: a.message };

    case "DONE_WITH_STATS":
      return { ...s, phase: s.phase === "error" ? "error" : "done", totalTokens: a.totalTokens, estimatedCostUsd: a.estimatedCostUsd };

    case "DONE":
      return { ...s, phase: s.phase === "error" ? "error" : "done" };

    default:
      return s;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function useDebateStream() {
  const [state, dispatch] = useReducer(reducer, INIT);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (config: DebateConfig) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    dispatch({ type: "RESET", maxRounds: config.maxRounds, debaterAModel: JUDGE_DISPLAY[config.debaterAVendor][config.tier], debaterBModel: JUDGE_DISPLAY[config.debaterBVendor][config.tier] });

    let buffer = "";

    try {
      const res = await fetch(`${API_URL}/api/debate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: config.question,
          tier: config.tier,
          max_rounds: config.maxRounds,
          judge_vendor: config.judgeVendor,
          debater_a_vendor: config.debaterAVendor,
          debater_b_vendor: config.debaterBVendor,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          if (!block.trim()) continue;

          let eventType = "message";
          let dataStr = "";

          for (const line of block.split(/\r?\n/)) {
            if (line.startsWith("event: "))      eventType = line.slice(7).trim();
            else if (line.startsWith("data: "))  dataStr   = line.slice(6).trim();
          }

          if (!dataStr) continue;

          let data: Record<string, unknown>;
          try { data = JSON.parse(dataStr); } catch { continue; }

          switch (eventType) {
            case "round_start":
              dispatch({ type: "ROUND_START", round: data.round as number });
              break;
            case "token":
              dispatch({ type: "TOKEN", agent: data.agent as string, text: data.text as string });
              break;
            case "turn_complete":
              dispatch({
                type: "TURN_COMPLETE",
                agent:      data.agent           as string,
                confidence: data.confidence      as number,
                disputes:   (data.disputes       as unknown[]) ?? [],
                totalTokens:     (data.total_tokens      as number) ?? 0,
                estimatedCostUsd: (data.estimated_cost_usd as number) ?? 0,
              });
              break;
            case "convergence":
              dispatch({ type: "CONVERGENCE", converged: data.converged as boolean });
              break;
            case "judge_start":
              dispatch({ type: "JUDGE_START" });
              break;
            case "verdict":
              dispatch({ type: "VERDICT", verdict: data as unknown as VerdictData });
              break;
            case "error":
              dispatch({ type: "ERROR", message: (data.message as string) ?? "Unknown error" });
              break;
            case "done":
              dispatch({ type: "DONE_WITH_STATS", totalTokens: (data.total_tokens as number) ?? 0, estimatedCostUsd: (data.estimated_cost_usd as number) ?? 0 });
              break;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      dispatch({ type: "ERROR", message: (err as Error).message });
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "RESET", maxRounds: INIT.maxRounds, debaterAModel: "", debaterBModel: "" });
  }, []);

  return { state, start, stop };
}
