const STORAGE_KEY = "mz_debates";
const MAX_DEBATES = 50;
export const AUTO_ACCEPT_MS = 2 * 60 * 1000;

export type DebateStatus = "verdict_pending" | "accepted" | "challenged" | "expired";

export interface SavedDebate {
  id: string;
  question: string;
  tier: string;
  judgeVendor: string;
  debaterAVendor: string;
  debaterBVendor: string;
  maxRounds: number;
  debaterAModel: string;
  debaterBModel: string;
  log: unknown[];
  rawTranscript: unknown[];
  verdict: unknown | null;
  status: DebateStatus;
  createdAt: number;
  verdictAt?: number;
  parentId?: string;
  childId?: string;
  totalTokens: number;
  estimatedCostUsd: number;
}

function load(): SavedDebate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedDebate[];
  } catch {
    return [];
  }
}

function persist(debates: SavedDebate[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(debates));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

export function listDebates(): SavedDebate[] {
  const now = Date.now();
  const debates = load();
  let changed = false;

  const updated = debates.map((d) => {
    if (d.status === "verdict_pending" && d.verdictAt != null && now - d.verdictAt > AUTO_ACCEPT_MS) {
      changed = true;
      return { ...d, status: "expired" as DebateStatus };
    }
    return d;
  });

  if (changed) persist(updated);

  // Return newest first
  return updated.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export function getDebate(id: string): SavedDebate | null {
  const debates = load();
  return debates.find((d) => d.id === id) ?? null;
}

export function upsertDebate(debate: SavedDebate): void {
  const debates = load();
  const idx = debates.findIndex((d) => d.id === debate.id);
  if (idx >= 0) {
    debates[idx] = debate;
  } else {
    debates.unshift(debate);
    // Trim to max
    if (debates.length > MAX_DEBATES) debates.splice(MAX_DEBATES);
  }
  persist(debates);
}

export function acceptDebate(id: string): void {
  const debates = load();
  const idx = debates.findIndex((d) => d.id === id);
  if (idx >= 0) {
    debates[idx] = { ...debates[idx], status: "accepted" };
    persist(debates);
  }
}

export function challengeDebate(id: string, childId: string): void {
  const debates = load();
  const idx = debates.findIndex((d) => d.id === id);
  if (idx >= 0) {
    debates[idx] = { ...debates[idx], status: "challenged", childId };
    persist(debates);
  }
}
