import type { ExpressionState } from "@/lib/sceneAssets";

export type Vendor = "anthropic" | "google" | "openai";

export interface DebaterConfig {
  role: "debater_a" | "debater_b";
  vendor: Vendor;
  model: string;
  expression: ExpressionState;
  confidence: number;       // 0–1
  currentRound: number;
  currentRoundName: string;
  currentSpeech: string;
}

export interface JudgeConfig {
  vendor: Vendor;
  model: string;
  expression: ExpressionState;
  status: string;
  rounds: Array<{ label: string; name: string; done: boolean; active: boolean }>;
}

export type ActionCategory = "ask_now" | "worth_pursuing" | "let_go" | "revisit";

export interface ActionItem {
  category: ActionCategory;
  content: string;
  timing: string;
}

export interface VerdictData {
  agreements: string[];
  unresolved_disputes: Array<{
    topic: string;
    a_position: string;
    b_position: string;
    ruling: string;
    reasoning: string;
  }>;
  recommendation: string;
  confidence: number;
  dissent_notes: string;
  action_items: ActionItem[];
  winner: "debater_a" | "debater_b" | "tie";
  suggested_path: string;
}

export type LogEntry =
  | { type: "turn"; role: "debater_a" | "debater_b"; round: number; roundName: string; model: string; title: string; content: string }
  | { type: "agreement"; after: string; title: string; content: string }
  | { type: "dispute"; after: string; title: string; positions: Array<{ vendor: string; model: string; text: string }> };

export interface DebateRoomProps {
  question: string;
  debaterA: DebaterConfig;
  debaterB: DebaterConfig;
  judge: JudgeConfig;
  verdict?: VerdictData | null;
  log: LogEntry[];
  onReset?: () => void;
  totalTokens?: number;
  estimatedCostUsd?: number;
}
