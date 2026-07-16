import type { LogEntry, ExhibitRow, Vendor } from "./types";
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
      background: "var(--mz-card)",
      borderTop: `3px solid ${accentColor}`,
      border: `1px solid var(--mz-border)`,
      borderTopWidth: 3,
      borderTopColor: accentColor,
      padding: "11px 13px",
      animation: "mzRise 0.5s ease both",
      boxSizing: "border-box",
    }}>
      {children}
    </div>
  );
}

function CardHeader({ label, labelColor, sub, vendor, icon }: { label: string; labelColor: string; sub?: string; vendor?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.22em", color: labelColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
        {icon}
        {label}
      </span>
      {sub && (
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(46,42,32,0.4)", flexShrink: 0, whiteSpace: "nowrap" }}>
          {vendor && <VendorIcon vendor={vendor as Vendor} size={10} />}
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

function ExhibitCard({ entry }: { entry: Extract<LogEntry, { type: "exhibit" }> }) {
  return (
    <CardShell accentColor="#FF6B4A">
      <CardHeader label="THE RECORD" labelColor="#E0512F" sub={entry.meta} />
      <CardTitle>{entry.title}</CardTitle>
      <div style={{ marginTop: 8 }}>
        {entry.rows.map((row: ExhibitRow, i: number) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            padding: "3px 0",
            borderBottom: "1px dotted rgba(46,42,32,0.18)",
          }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 12, color: "rgba(46,42,32,0.8)" }}>
              {row.item}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "rgba(46,42,32,0.65)" }}>
              {row.value}
            </span>
          </div>
        ))}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          padding: "4px 0 0",
          borderTop: "2px solid rgba(255,107,74,0.4)",
          marginTop: 3,
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.14em", color: "#E0512F" }}>
            {entry.total_label}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, color: "#E0512F" }}>
            {entry.total_value}
          </span>
        </div>
      </div>
    </CardShell>
  );
}

function TurnCard({ entry }: { entry: Extract<LogEntry, { type: "turn" }> }) {
  const isA = entry.role === "debater_a";
  const color = ROLE_COLOR[entry.role];

  return (
    <div style={{ display: "flex", justifyContent: isA ? "flex-start" : "flex-end" }}>
      <div style={{
        width: "86%",
        background: "var(--mz-card)",
        border: "1px solid var(--mz-border)",
        borderLeft: isA ? `3px solid ${color}` : undefined,
        borderRight: !isA ? `3px solid ${color}` : undefined,
        padding: "11px 13px",
        animation: "mzRise 0.5s ease both",
        boxSizing: "border-box",
      }}>
        <CardHeader
          label={`${entry.model} · ROUND ${toRoman(entry.round)} · ${entry.roundName.toUpperCase()}`}
          labelColor={color}
          icon={<VendorIcon vendor={entry.vendor as Vendor} size={10} />}
        />
        <CardTitle>{entry.title}</CardTitle>
        <div
          className="mz-scroll"
          style={{ marginTop: 7, maxHeight: 160, overflowY: "auto", fontFamily: "var(--font-serif)", fontSize: 12.5, lineHeight: 1.55, color: "rgba(46,42,32,0.85)", paddingRight: 4 }}
        >
          {renderText(entry.content)}
        </div>
      </div>
    </div>
  );
}

function AgreementCard({ entry }: { entry: Extract<LogEntry, { type: "agreement" }> }) {
  return (
    <CardShell accentColor="rgb(124,148,115)">
      <CardHeader label="AGREED" labelColor="var(--mz-agreed)" sub={entry.after} />
      <CardTitle>{entry.title}</CardTitle>
      <div style={{
        fontFamily: "var(--font-serif)",
        fontSize: 12.5,
        lineHeight: 1.55,
        color: "rgba(46,42,32,0.8)",
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
      <CardHeader label="IN DISPUTE" labelColor="var(--mz-text)" sub={entry.after} />
      <CardTitle>{entry.title}</CardTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 7 }}>
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
  vertical?: boolean;
}

export default function DiscussionLog({ log, vertical }: Props) {
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
        if (entry.type === "turn")      return <TurnCard      key={i} entry={entry} />;
        if (entry.type === "agreement") return <AgreementCard key={i} entry={entry} />;
        if (entry.type === "dispute")   return <DisputeCard   key={i} entry={entry} />;
      })}
    </div>
  );
}
