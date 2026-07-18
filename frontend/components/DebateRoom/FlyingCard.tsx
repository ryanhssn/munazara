"use client";

import type { Vendor } from "./types";
import VendorIcon, { VENDOR_COLOR, VENDOR_ICON_COLOR, VENDOR_LABEL } from "./VendorIcon";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  agent: "debater_a" | "debater_b";
  vendor: Vendor;
  model: string;
  round: number;
  roundName: string;
  confidence: number;
  speech: string;
  fromRect: Rect;
  destRect: Rect;
  onDone: () => void;
}

function toRoman(n: number): string {
  return ["I", "II", "III", "IV", "V"][n - 1] ?? String(n);
}

export default function FlyingCard({ agent, vendor, model, round, roundName, confidence, speech, fromRect, destRect, onDone }: Props) {
  const color = VENDOR_COLOR[vendor];
  const iconColor = VENDOR_ICON_COLOR[vendor];
  const pct = Math.round(confidence * 100);

  const dx = fromRect.left - destRect.left;
  const dy = fromRect.top - destRect.top;
  const scale = fromRect.width / Math.max(destRect.width, 1);

  return (
    <div
      onAnimationEnd={onDone}
      style={{
        position: "fixed",
        left: destRect.left,
        top: destRect.top,
        width: destRect.width,
        zIndex: 9999,
        pointerEvents: "none",
        transformOrigin: "top left",
        animation: "mzCardFly 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "--fly-x": `${dx}px`,
        "--fly-y": `${dy}px`,
        "--fly-scale": scale,
      } as React.CSSProperties}
    >
      <div style={{
        width: "100%",
        background: "var(--glass-fill-2)",
        backdropFilter: "blur(var(--glass-blur-lg)) saturate(160%)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-xl)",
        boxShadow: `0 0 0 2px ${color}, 0 8px 32px ${color}4d, var(--shadow-2)`,
        padding: "9px 11px",
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 7.5, letterSpacing: "0.16em", color }}>
          <VendorIcon vendor={vendor} size={9} color={iconColor} />
          {agent === "debater_a" ? "DEBATER A" : "DEBATER B"} · {VENDOR_LABEL[vendor]}
        </div>
        <div style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 13, color: "var(--ink)", marginTop: 2 }}>
          {model}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 6.5, letterSpacing: "0.12em", color: "var(--muted)" }}>CONF</span>
          <span style={{ display: "block", flex: "1 1 0", height: 3, background: "rgba(0,0,0,0.1)" }}>
            <span style={{ display: "block", height: 3, background: color, width: `${pct}%` }} />
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color }}>{pct}%</span>
        </div>
        <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px dotted var(--glass-border)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: "0.16em", color, marginBottom: 4 }}>
            ROUND {toRoman(round)} · {roundName.toUpperCase()}
          </div>
          <div style={{ maxHeight: 80, overflow: "hidden", fontFamily: "var(--font-serif)", fontSize: 12.5, lineHeight: 1.55, color: "var(--ink)" }}>
            {speech}
          </div>
        </div>
      </div>
    </div>
  );
}
