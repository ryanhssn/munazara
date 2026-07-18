"use client";

import { useReducer, useCallback, useRef } from "react";
import type { ExpressionState } from "@/lib/sceneAssets";
import type { VerdictData, Vendor, LogEntry } from "@/components/DebateRoom/types";
import { getRoundName, JUDGE_DISPLAY } from "@/lib/models";
import { API_URL } from "@/lib/config";

export interface DebateConfig {
  question: string;
  tier: "fast" | "balanced" | "deep";
  maxRounds: number;
  judgeVendor: Vendor;
  debaterAVendor: Vendor;
  debaterBVendor: Vendor;
  enableRag: boolean;
}

export interface StreamState {
  phase: "idle" | "debating" | "judging" | "done" | "error";
  debateId: string | null;
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
  debaterAVendor: Vendor;
  debaterBVendor: Vendor;
  totalTokens: number;
  estimatedCostUsd: number;
  tokenOffset: number;
  costOffset: number;
  rawTranscript: unknown[];
}

type Action =
  | { type: "RESET"; debateId: string; maxRounds: number; debaterAModel: string; debaterBModel: string; debaterAVendor: Vendor; debaterBVendor: Vendor }
  | { type: "CONTINUE_DEBATE"; debateId: string; challenge: string; maxRounds: number; debaterAModel: string; debaterBModel: string; debaterAVendor: Vendor; debaterBVendor: Vendor }
  | { type: "DONE_WITH_STATS"; totalTokens: number; estimatedCostUsd: number; transcript?: unknown[] }
  | { type: "EXHIBIT"; meta: string; title: string; rows: { item: string; value: string }[]; total_label: string; total_value: string }
  | { type: "ROUND_START"; round: number }
  | { type: "TOKEN"; agent: string; text: string }
  | { type: "TURN_COMPLETE"; agent: string; title: string; confidence: number; disputes: unknown[]; totalTokens: number; estimatedCostUsd: number; turnInputTokens: number; turnOutputTokens: number; elapsedMs: number }
  | { type: "CONVERGENCE"; converged: boolean }
  | { type: "JUDGE_START" }
  | { type: "VERDICT"; verdict: VerdictData }
  | { type: "ERROR"; message: string }
  | { type: "DONE" };

const INIT: StreamState = {
  phase: "idle",
  debateId: null,
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
  debaterAVendor: "anthropic" as Vendor,
  debaterBVendor: "google" as Vendor,
  totalTokens: 0,
  estimatedCostUsd: 0,
  tokenOffset: 0,
  costOffset: 0,
  rawTranscript: [],
};

function reducer(s: StreamState, a: Action): StreamState {
  switch (a.type) {
    case "RESET":
      return { ...INIT, phase: "debating", debateId: a.debateId, maxRounds: a.maxRounds, judgeStatus: "Round 1 underway", debaterAModel: a.debaterAModel, debaterBModel: a.debaterBModel, debaterAVendor: a.debaterAVendor, debaterBVendor: a.debaterBVendor };

    case "CONTINUE_DEBATE": {
      const challengeEntry: LogEntry = { type: "challenge", text: a.challenge };
      return {
        ...INIT,
        phase: "debating",
        debateId: a.debateId,
        maxRounds: a.maxRounds,
        debaterAModel: a.debaterAModel,
        debaterBModel: a.debaterBModel,
        debaterAVendor: a.debaterAVendor,
        debaterBVendor: a.debaterBVendor,
        judgeStatus: "Round 1 underway",
        log: [...s.log, challengeEntry],
        rawTranscript: s.rawTranscript,
        tokenOffset: s.totalTokens,
        costOffset: s.estimatedCostUsd,
        totalTokens: s.totalTokens,
        estimatedCostUsd: s.estimatedCostUsd,
      };
    }

    case "EXHIBIT": {
      const entry: LogEntry = { type: "exhibit", meta: a.meta, title: a.title, rows: a.rows, total_label: a.total_label, total_value: a.total_value };
      return { ...s, log: [entry, ...s.log] };
    }

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
      const vendor = isA ? s.debaterAVendor : s.debaterBVendor;
      const entry: LogEntry = {
        type: "turn",
        role: a.agent as "debater_a" | "debater_b",
        round: s.currentRound,
        roundName: getRoundName(s.currentRound),
        vendor,
        model,
        title: a.title,
        content: speech,
        tokens: a.turnInputTokens || a.turnOutputTokens ? { input: a.turnInputTokens, output: a.turnOutputTokens } : undefined,
        elapsedMs: a.elapsedMs || undefined,
      };
      if (isA)
        return { ...s, debaterAConfidence: a.confidence, debaterAExpression: a.disputes.length > 0 ? "disagreeing" : "agreeing", debaterBExpression: "thinking", log: [...s.log, entry], totalTokens: s.tokenOffset + a.totalTokens, estimatedCostUsd: s.costOffset + a.estimatedCostUsd };
      if (a.agent === "debater_b")
        return { ...s, debaterBConfidence: a.confidence, debaterBExpression: a.disputes.length > 0 ? "disagreeing" : "agreeing", debaterAExpression: "thinking", log: [...s.log, entry], totalTokens: s.tokenOffset + a.totalTokens, estimatedCostUsd: s.costOffset + a.estimatedCostUsd };
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
      return { ...s, phase: s.phase === "error" ? "error" : "done", totalTokens: s.tokenOffset + a.totalTokens, estimatedCostUsd: s.costOffset + a.estimatedCostUsd, rawTranscript: a.transcript ?? s.rawTranscript };

    case "DONE":
      return { ...s, phase: s.phase === "error" ? "error" : "done" };

    default:
      return s;
  }
}

export function useDebateStream() {
  const [state, dispatch] = useReducer(reducer, INIT);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (config: DebateConfig) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const id = crypto.randomUUID();
    dispatch({ type: "RESET", debateId: id, maxRounds: config.maxRounds, debaterAModel: JUDGE_DISPLAY[config.debaterAVendor][config.tier], debaterBModel: JUDGE_DISPLAY[config.debaterBVendor][config.tier], debaterAVendor: config.debaterAVendor, debaterBVendor: config.debaterBVendor });

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
          enable_rag: config.enableRag,
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
            case "exhibit":
              dispatch({
                type: "EXHIBIT",
                meta:        data.meta        as string,
                title:       data.title       as string,
                rows:        data.rows        as { item: string; value: string }[],
                total_label: data.total_label as string,
                total_value: data.total_value as string,
              });
              break;
            case "round_start":
              dispatch({ type: "ROUND_START", round: data.round as number });
              break;
            case "token":
              dispatch({ type: "TOKEN", agent: data.agent as string, text: data.text as string });
              break;
            case "turn_complete":
              dispatch({
                type: "TURN_COMPLETE",
                agent:            data.agent                as string,
                title:            (data.title               as string) ?? "",
                confidence:       data.confidence           as number,
                disputes:         (data.disputes            as unknown[]) ?? [],
                totalTokens:      (data.total_tokens        as number) ?? 0,
                estimatedCostUsd: (data.estimated_cost_usd  as number) ?? 0,
                turnInputTokens:  (data.turn_input_tokens   as number) ?? 0,
                turnOutputTokens: (data.turn_output_tokens  as number) ?? 0,
                elapsedMs:        (data.elapsed_ms          as number) ?? 0,
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
              dispatch({ type: "DONE_WITH_STATS", totalTokens: (data.total_tokens as number) ?? 0, estimatedCostUsd: (data.estimated_cost_usd as number) ?? 0, transcript: (data.transcript as unknown[]) ?? undefined });
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
    dispatch({ type: "RESET", debateId: crypto.randomUUID(), maxRounds: INIT.maxRounds, debaterAModel: "", debaterBModel: "", debaterAVendor: INIT.debaterAVendor, debaterBVendor: INIT.debaterBVendor });
  }, []);

  const continueDebate = useCallback(async (challenge: string, config: DebateConfig, priorTranscript: unknown[]) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const id = crypto.randomUUID();
    dispatch({
      type: "CONTINUE_DEBATE",
      debateId: id,
      challenge,
      maxRounds: config.maxRounds,
      debaterAModel: JUDGE_DISPLAY[config.debaterAVendor][config.tier],
      debaterBModel: JUDGE_DISPLAY[config.debaterBVendor][config.tier],
      debaterAVendor: config.debaterAVendor,
      debaterBVendor: config.debaterBVendor,
    });

    let buffer = "";

    try {
      const res = await fetch(`${API_URL}/api/debate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: challenge,
          tier: config.tier,
          max_rounds: config.maxRounds,
          judge_vendor: config.judgeVendor,
          debater_a_vendor: config.debaterAVendor,
          debater_b_vendor: config.debaterBVendor,
          prior_transcript: priorTranscript,
          enable_rag: config.enableRag,
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
            case "exhibit":
              dispatch({ type: "EXHIBIT", meta: data.meta as string, title: data.title as string, rows: data.rows as { item: string; value: string }[], total_label: data.total_label as string, total_value: data.total_value as string });
              break;
            case "round_start":
              dispatch({ type: "ROUND_START", round: data.round as number });
              break;
            case "token":
              dispatch({ type: "TOKEN", agent: data.agent as string, text: data.text as string });
              break;
            case "turn_complete":
              dispatch({
                type: "TURN_COMPLETE",
                agent:            data.agent                as string,
                title:            (data.title               as string) ?? "",
                confidence:       data.confidence           as number,
                disputes:         (data.disputes            as unknown[]) ?? [],
                totalTokens:      (data.total_tokens        as number) ?? 0,
                estimatedCostUsd: (data.estimated_cost_usd  as number) ?? 0,
                turnInputTokens:  (data.turn_input_tokens   as number) ?? 0,
                turnOutputTokens: (data.turn_output_tokens  as number) ?? 0,
                elapsedMs:        (data.elapsed_ms          as number) ?? 0,
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
              dispatch({ type: "DONE_WITH_STATS", totalTokens: (data.total_tokens as number) ?? 0, estimatedCostUsd: (data.estimated_cost_usd as number) ?? 0, transcript: (data.transcript as unknown[]) ?? undefined });
              break;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      dispatch({ type: "ERROR", message: (err as Error).message });
    }
  }, []);

  return { state, start, stop, continueDebate };
}
