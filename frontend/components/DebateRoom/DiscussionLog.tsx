import type { LogEntry, Vendor } from "./types";
import { VENDOR_COLOR } from "./VendorIcon";

const ROLE_COLOR: Record<"debater_a" | "debater_b", string> = {
  debater_a: "rgb(93, 147, 182)",
  debater_b: "rgb(211, 134, 90)",
};

function toRoman(n: number): string {
  return ["I", "II", "III", "IV", "V"][n - 1] ?? String(n);
}

function CardShell({ accentColor, children }: { accentColor: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: "0 0 300px",
        background: "var(--mz-card)",
        borderWidth: "3px 1px 1px",
        borderStyle: "solid",
        borderColor: `${accentColor} var(--mz-border) var(--mz-border)`,
        padding: "11px 13px",
        animation: "mzRise 0.5s ease both",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ label, labelColor, sub }: { label: string; labelColor: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.22em", color: labelColor }}>
        {label}
      </span>
      {sub && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(46,42,32,0.4)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 13, lineHeight: 1.3, color: "var(--mz-text)", marginTop: 5 }}>
      {children}
    </div>
  );
}

function TurnCard({ entry }: { entry: Extract<LogEntry, { type: "turn" }> }) {
  const color = ROLE_COLOR[entry.role];
  const label = entry.role === "debater_a" ? "DEBATER A" : "DEBATER B";
  return (
    <CardShell accentColor={color}>
      <CardHeader label={`${label} · ROUND ${toRoman(entry.round)} · ${entry.roundName.toUpperCase()}`} labelColor={color} sub={entry.model} />
      <CardTitle>{entry.title}</CardTitle>
      <div
        className="mz-scroll"
        style={{ marginTop: 7, maxHeight: 160, overflowY: "auto", fontFamily: "var(--font-serif)", fontSize: 12.5, lineHeight: 1.55, color: "rgba(46,42,32,0.8)", paddingRight: 4 }}
      >
        {entry.content}
      </div>
    </CardShell>
  );
}

function AgreementCard({ entry }: { entry: Extract<LogEntry, { type: "agreement" }> }) {
  return (
    <CardShell accentColor="rgb(124, 148, 115)">
      <CardHeader label="AGREED" labelColor="var(--mz-agreed)" sub={entry.after} />
      <CardTitle>{entry.title}</CardTitle>
      <div
        className="mz-scroll"
        style={{ fontFamily: "var(--font-serif)", fontSize: 12.5, lineHeight: 1.55, color: "rgba(46,42,32,0.8)", marginTop: 6, borderLeft: "2px solid var(--mz-agreed)", paddingLeft: 9, maxHeight: 160, overflowY: "auto" }}
      >
        {entry.content}
      </div>
    </CardShell>
  );
}

function DisputeCard({ entry }: { entry: Extract<LogEntry, { type: "dispute" }> }) {
  return (
    <CardShell accentColor="rgb(139, 94, 60)">
      <CardHeader label="IN DISPUTE" labelColor="var(--mz-text)" sub={entry.after} />
      <CardTitle>{entry.title}</CardTitle>
      <div
        className="mz-scroll"
        style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 7, maxHeight: 160, overflowY: "auto", paddingRight: 4 }}
      >
        {entry.positions.map((p, i) => {
          const color = VENDOR_COLOR[p.vendor as Vendor];
          return (
            <div key={i} style={{ borderLeft: `2px solid ${color}`, paddingLeft: 9 }}>
              <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 12, lineHeight: 1.5, color: "rgba(46,42,32,0.8)" }}>
                {p.text}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, letterSpacing: "0.16em", color, marginTop: 2 }}>
                {p.vendor.toUpperCase()} · {p.model.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}

interface Props {
  log: LogEntry[];
}

export default function DiscussionLog({ log }: Props) {
  return (
    <div
      style={{
        flex: "1 1 0",
        display: "flex",
        gap: 12,
        overflowX: "auto",
        padding: "8px clamp(14px, 2.5vw, 30px) 16px",
        alignItems: "stretch",
      }}
    >
      {log.map((entry, i) => {
        if (entry.type === "turn") return <TurnCard key={i} entry={entry} />;
        if (entry.type === "agreement") return <AgreementCard key={i} entry={entry} />;
        if (entry.type === "dispute") return <DisputeCard key={i} entry={entry} />;
      })}
    </div>
  );
}
