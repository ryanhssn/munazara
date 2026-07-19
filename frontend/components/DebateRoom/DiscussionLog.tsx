import { useRef, useEffect } from "react";
import type { LogEntry, ExhibitRow, Vendor, EvidenceSource } from "./types";
import VendorIcon, { VENDOR_COLOR } from "./VendorIcon";

function renderText(text: string): React.ReactNode {
  const parts = text.split(/\*([^*]+)\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

const ROLE_COLOR: Record<"debater_a" | "debater_b", string> = {
  debater_a: "rgb(93, 147, 182)",
  debater_b: "rgb(211, 134, 90)",
};

function toRoman(n: number): string {
  return ["I", "II", "III", "IV", "V"][n - 1] ?? String(n);
}

// Shell for non-turn cards (full-width, top border accent)
function CardShell({ accentColor, children }: { accentColor: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255, 252, 242, 0.55)",
      backdropFilter: "blur(20px) saturate(160%)",
      border: `1px solid rgba(255,255,255,0.7)`,
      borderRadius: "var(--radius-lg)",
      padding: "11px 13px",
      animation: "mzRise 0.5s ease both",
      boxSizing: "border-box",
      boxShadow: "var(--shadow-2)",
    }}>
      {children}
    </div>
  );
}

function CardHeader({ label, labelColor, sub, vendor, icon }: { label: string; labelColor: string; sub?: string; vendor?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 600, letterSpacing: "0.22em", color: labelColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
        {icon}
        {label}
      </span>
      {sub && (
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--muted-2)", flexShrink: 0, whiteSpace: "nowrap" }}>
          {vendor && <VendorIcon vendor={vendor as Vendor} size={10} />}
          {sub}
        </span>
      )}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 13, lineHeight: 1.3, color: "var(--ink)", marginTop: 5 }}>
      {children}
    </div>
  );
}

function ExhibitCard({ entry }: { entry: Extract<LogEntry, { type: "exhibit" }> }) {
  return (
    <CardShell accentColor="var(--accent)">
      <CardHeader label="THE RECORD" labelColor="var(--accent)" sub={entry.meta} />
      <CardTitle>{entry.title}</CardTitle>
      <div style={{ marginTop: 8 }}>
        {entry.rows.map((row: ExhibitRow, i: number) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            padding: "3px 0",
            borderBottom: "1px dotted var(--glass-border)",
          }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 12, color: "var(--ink-soft)" }}>
              {row.item}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 600, color: "var(--ink-soft)" }}>
              {row.value}
            </span>
          </div>
        ))}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          padding: "4px 0 0",
          borderTop: "2px solid var(--accent-tint)",
          marginTop: 3,
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.14em", color: "var(--accent)" }}>
            {entry.total_label}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, color: "var(--accent)" }}>
            {entry.total_value}
          </span>
        </div>
      </div>
    </CardShell>
  );
}

function TurnCard({ entry, isNewest }: { entry: Extract<LogEntry, { type: "turn" }>; isNewest?: boolean }) {
  const isA = entry.role === "debater_a";
  const color = ROLE_COLOR[entry.role];

  return (
    <div style={{ display: "flex", justifyContent: isA ? "flex-start" : "flex-end" }}>
      <div style={{
        width: "86%",
        background: "rgba(255, 252, 242, 0.55)",
        backdropFilter: "blur(20px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.7)",
        borderRadius: "var(--radius-lg)",
        padding: "11px 13px",
        animation: isNewest
          ? "mzRise 0.45s cubic-bezier(0.22,1,0.36,1) 0.58s both"
          : "mzRise 0.5s ease both",
        boxSizing: "border-box",
        boxShadow: "var(--shadow-2)",
      }}>
        <CardHeader
          label={`${entry.model} · ROUND ${toRoman(entry.round)} · ${entry.roundName.toUpperCase()}`}
          labelColor={color}
          icon={<VendorIcon vendor={entry.vendor as Vendor} size={10} />}
        />
        <CardTitle>{entry.title}</CardTitle>
        <div
          className="mz-scroll"
          style={{ marginTop: 7, maxHeight: 160, overflowY: "auto", fontFamily: "var(--font-serif)", fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-soft)", paddingRight: 4 }}
        >
          {renderText(entry.content)}
        </div>
        {(entry.tokens || entry.confidence !== undefined) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 5, borderTop: "1px dotted var(--glass-border)", fontFamily: "var(--font-mono)", fontSize: 7.5, fontWeight: 600, letterSpacing: "0.1em", color: "var(--ink-soft)" }}>
            {entry.tokens && <span style={{ flexShrink: 0 }}>{(entry.tokens.input + entry.tokens.output).toLocaleString()} tokens</span>}
            {entry.confidence !== undefined && (
              <>
                <span style={{ flexShrink: 0, fontSize: 6.5, letterSpacing: "0.12em", color: "var(--muted)" }}>CONF</span>
                <span style={{ display: "block", flex: "1 1 0", height: 3, background: "rgba(0,0,0,0.1)" }}>
                  <span style={{ display: "block", height: 3, background: color, width: `${Math.round(entry.confidence * 100)}%`, transformOrigin: "left", animation: "mzConfBar 0.9s cubic-bezier(0.22,1,0.36,1) both" }} />
                </span>
                <span style={{ flexShrink: 0, color }}>{Math.round(entry.confidence * 100)}%</span>
              </>
            )}
            {entry.elapsedMs !== undefined && <span style={{ flexShrink: 0 }}>{(entry.elapsedMs / 1000).toFixed(1)}s</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceCard({ entry }: { entry: Extract<LogEntry, { type: "evidence" }> }) {
  const isA = entry.agent === "debater_a";
  const color = ROLE_COLOR[entry.agent];

  function domainOf(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
  }

  return (
    <div style={{ display: "flex", justifyContent: isA ? "flex-start" : "flex-end" }}>
      <div style={{
        width: "86%",
        background: "rgba(240, 245, 255, 0.45)",
        backdropFilter: "blur(16px) saturate(140%)",
        border: `1px solid rgba(255,255,255,0.6)`,
        borderLeft: `2px solid ${color}`,
        borderRadius: "var(--radius-lg)",
        padding: "9px 12px",
        animation: "mzRise 0.4s ease both",
        boxSizing: "border-box",
        boxShadow: "var(--shadow-2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, fontWeight: 600, letterSpacing: "0.2em", color }}>SOURCES CONSULTED</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--muted-2)" }}>· ROUND {toRoman(entry.round)}</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, color: "var(--muted)", marginBottom: 7, fontStyle: "italic" }}>
          "{entry.query}"
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(entry.sources as EvidenceSource[]).map((src, i) => (
            <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                padding: "4px 7px",
                background: "rgba(255,255,255,0.5)",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.7)",
              }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--muted-3)", flexShrink: 0 }}>[{i + 1}]</span>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 11, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{src.title}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color, flexShrink: 0 }}>{domainOf(src.url)}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChallengeCard({ entry }: { entry: Extract<LogEntry, { type: "challenge" }> }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 2px" }}>
      <div style={{ flex: 1, height: 1, background: "var(--glass-border)" }} />
      <div style={{ textAlign: "center", minWidth: 0, maxWidth: 180 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: "0.22em", color: "var(--muted-3)", marginBottom: 3 }}>COUNTER-CHALLENGE</div>
        <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4, wordBreak: "break-word" }}>"{entry.text}"</div>
      </div>
      <div style={{ flex: 1, height: 1, background: "var(--glass-border)" }} />
    </div>
  );
}

function AgreementCard({ entry }: { entry: Extract<LogEntry, { type: "agreement" }> }) {
  return (
    <CardShell accentColor="rgb(124,148,115)">
      <CardHeader label="AGREED" labelColor="var(--accent-green)" sub={entry.after} />
      <CardTitle>{entry.title}</CardTitle>
      <div style={{
        fontFamily: "var(--font-serif)",
        fontSize: 12.5,
        lineHeight: 1.55,
        color: "var(--ink-soft)",
        marginTop: 6,
        borderLeft: "2px solid var(--mz-agreed)",
        paddingLeft: 9,
      }}>
        {renderText(entry.content)}
      </div>
    </CardShell>
  );
}

function DisputeCard({ entry }: { entry: Extract<LogEntry, { type: "dispute" }> }) {
  return (
    <CardShell accentColor="rgb(139,94,60)">
      <CardHeader label="IN DISPUTE" labelColor="var(--ink)" sub={entry.after} />
      <CardTitle>{entry.title}</CardTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 7 }}>
        {entry.positions.map((p, i) => {
          const color = VENDOR_COLOR[p.vendor as Vendor];
          return (
            <div key={i} style={{ borderLeft: `2px solid ${color}`, paddingLeft: 9 }}>
              <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 12, lineHeight: 1.5, color: "var(--ink-soft)" }}>
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
  vertical?: boolean;
  flyLogIndex?: number;
}

export default function DiscussionLog({ log, vertical, flyLogIndex }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length]);

  return (
    <div className="mz-scroll" style={{
      flex: "1 1 0",
      display: "flex",
      flexDirection: vertical ? "column" : "row",
      gap: vertical ? 10 : 12,
      overflowX: vertical ? "hidden" : "auto",
      overflowY: vertical ? "auto" : "hidden",
      padding: vertical ? "10px 14px 20px" : "8px clamp(14px, 2.5vw, 30px) 16px",
    }}>
      {log.map((entry, i) => {
        if (entry.type === "exhibit")   return <ExhibitCard   key={i} entry={entry} />;
        if (entry.type === "turn")      return <TurnCard      key={i} entry={entry} isNewest={i === flyLogIndex} />;
        if (entry.type === "agreement") return <AgreementCard key={i} entry={entry} />;
        if (entry.type === "dispute")   return <DisputeCard   key={i} entry={entry} />;
        if (entry.type === "challenge") return <ChallengeCard key={i} entry={entry} />;
        if (entry.type === "evidence")  return <EvidenceCard  key={i} entry={entry} />;
      })}
      <div ref={endRef} style={{ flexShrink: 0, width: vertical ? undefined : 1, height: vertical ? 1 : undefined }} />
    </div>
  );
}
