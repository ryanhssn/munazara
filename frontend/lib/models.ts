export type Tier = "fast" | "balanced" | "deep";

export const DEBATER_A_DISPLAY: Record<Tier, string> = {
  fast:     "Claude Haiku",
  balanced: "Claude Sonnet",
  deep:     "Claude Opus",
};

export const DEBATER_B_DISPLAY: Record<Tier, string> = {
  fast:     "Gemini Flash",
  balanced: "Gemini Pro",
  deep:     "Gemini Pro",
};

export const DEBATER_DISPLAY: Record<string, Record<Tier, string>> = {
  anthropic: { fast: "Claude Haiku",  balanced: "Claude Sonnet",   deep: "Claude Opus"      },
  google:    { fast: "Gemini Flash",  balanced: "Gemini Pro",      deep: "Gemini 3.1 Pro"   },
  openai:    { fast: "GPT-4o mini",   balanced: "GPT-4o",          deep: "GPT-4o"           },
};

export const JUDGE_DISPLAY: Record<string, Record<Tier, string>> = {
  anthropic: { fast: "Claude Sonnet", balanced: "Claude Opus",     deep: "Claude Opus"      },
  google:    { fast: "Gemini Pro",    balanced: "Gemini 3.1 Pro",  deep: "Gemini 3.1 Pro"   },
  openai:    { fast: "GPT-4o",        balanced: "GPT-4o",          deep: "GPT-4o"           },
};

const ROUND_NAMES: Record<number, string> = {
  1: "Opening",
  2: "Rebuttal",
  3: "Reply",
  4: "Closing",
  5: "Final",
};

export function getRoundName(n: number): string {
  return ROUND_NAMES[n] ?? `Round ${n}`;
}
