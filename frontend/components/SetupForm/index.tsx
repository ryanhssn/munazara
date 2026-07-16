"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type FormEvent } from "react";
import type { DebateConfig } from "@/hooks/useDebateStream";
import type { Vendor } from "@/components/DebateRoom/types";
import VendorIcon, { VENDOR_ICON_COLOR } from "@/components/DebateRoom/VendorIcon";
import { JUDGE_DISPLAY, DEBATER_DISPLAY } from "@/lib/models";
import { pickRandom } from "@/lib/questions";

interface Props {
  onStart: (config: DebateConfig) => void;
}



const VENDORS: Vendor[] = ["anthropic", "google", "openai"];
const VENDOR_NAME: Record<Vendor, string> = { anthropic: "Anthropic", google: "Google", openai: "OpenAI" };
const DEBATER_A_IMG = "/assets/debater-a/headshot.png";
const DEBATER_B_IMG = "/assets/debater-b/headshot.png";


function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return { open, setOpen, ref };
}

interface DebaterCardProps {
  label: string;
  accentColor: string;
  vendor: Vendor;
  tier: "fast" | "balanced" | "deep";
  image: string;
  open: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onPick: (v: Vendor) => void;
}

function DebaterCardWithDropdown({ label, accentColor, vendor, tier, image, open, dropdownRef, onToggle, onPick }: DebaterCardProps) {
  return (
    <div style={{ position: "relative", flex: "1 1 240px", minWidth: 230, maxWidth: 300 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.25em", color: accentColor, textAlign: "center", marginBottom: 9 }}>
        {label}
      </div>
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <div style={cardStyle}>
          <span style={{ ...avatarStyle, border: `2px solid ${accentColor}` }}>
            <img src={image} alt="" style={avatarImgStyle} />
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <VendorIcon vendor={vendor} size={20} color={VENDOR_ICON_COLOR[vendor]} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "rgba(46,42,32,0.55)", textTransform: "uppercase" }}>
              {VENDOR_NAME[vendor]}
            </span>
          </span>
          <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 18, lineHeight: 1.1, color: "rgb(46,42,32)" }}>
            {DEBATER_DISPLAY[vendor][tier]}
          </span>
          <button
            type="button"
            onClick={onToggle}
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(224,81,47,0.8)", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}
          >
            CHANGE ▾
          </button>
        </div>

        {open && (
          <div style={dropdownPanelStyle}>
            {VENDORS.map((v) => {
              const selected = v === vendor;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => onPick(v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "10px 14px",
                    border: "none",
                    borderTop: "1px solid rgba(139,94,60,0.15)",
                    background: selected ? "rgba(255,107,74,0.12)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <VendorIcon vendor={v} size={20} color={VENDOR_ICON_COLOR[v]} />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.18em", color: "rgba(46,42,32,0.5)", textTransform: "uppercase" }}>
                      {VENDOR_NAME[v]}
                    </span>
                    <span style={{ display: "block", fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 14, lineHeight: 1.2, color: "rgb(46,42,32)", marginTop: 1 }}>
                      {DEBATER_DISPLAY[v][tier]}
                    </span>
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.14em", color: selected ? "rgb(224,81,47)" : "rgba(46,42,32,0.4)" }}>
                    {selected ? "selected" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupForm({ onStart }: Props) {
  const [question, setQuestion] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  useEffect(() => { setExamples(pickRandom(4)); }, []);
  const [tier, setTier] = useState<"fast" | "balanced" | "deep">("balanced");
  const [maxRounds, setMaxRounds] = useState(3);
  const [debaterAVendor, setDebaterAVendor] = useState<Vendor>("openai");
  const [debaterBVendor, setDebaterBVendor] = useState<Vendor>("google");
  const [judgeVendor, setJudgeVendor] = useState<Vendor>("anthropic");

  const dropA = useDropdown();
  const dropB = useDropdown();
  const dropJ = useDropdown();

  const pickA = useCallback((v: Vendor) => {
    setDebaterAVendor(v);
    dropA.setOpen(false);
  }, [dropA]);

  const pickB = useCallback((v: Vendor) => {
    setDebaterBVendor(v);
    dropB.setOpen(false);
  }, [dropB]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    onStart({ question: question.trim(), tier, maxRounds, judgeVendor, debaterAVendor, debaterBVendor });
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 700px at 50% -10%, rgba(124,148,115,0.16), rgba(124,148,115,0) 60%), rgb(246,241,228)", color: "rgb(46,42,32)", fontFamily: "var(--font-serif)" }}>
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "clamp(30px, 5vw, 64px) 20px 80px", position: "relative" }}>

        {/* Wordmark */}
        <div style={{ position: "relative", textAlign: "center", paddingTop: 10 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(32px, 5vw, 44px)", letterSpacing: "0.24em", textIndent: "0.24em", color: "rgb(46,42,32)" }}>MUNAZARA</div>
          <div style={{ fontFamily: "var(--font-arabic)", fontSize: 19, color: "rgba(46,42,32,0.55)", marginTop: 2 }}>مناظرہ</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", color: "rgba(46,42,32,0.55)", textTransform: "uppercase", marginTop: 14 }}>
            Two views make their case · the teacher weighs in
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "36px 0 24px" }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(139,94,60,0.5))" }} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.25em", color: "rgb(224,81,47)" }}>SET UP THE DISCUSSION</div>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(139,94,60,0.5))" }} />
        </div>

        {/* Tier + Rounds */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, marginBottom: 30 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <div style={{ display: "flex", border: "1px solid rgba(139,94,60,0.5)", background: "rgb(252,248,237)" }}>
              {(["fast", "balanced", "deep"] as const).map((t, i) => (
                <button key={t} type="button" onClick={() => setTier(t)} style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.14em", padding: "8px 18px", border: "none", borderLeft: i > 0 ? "1px solid rgba(139,94,60,0.3)" : "none", cursor: "pointer", background: tier === t ? "rgb(255,107,74)" : "transparent", color: tier === t ? "rgb(46,42,32)" : "rgba(46,42,32,0.75)", transition: "background 0.15s" }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.14em", color: "rgba(46,42,32,0.45)" }}>THINKING DEPTH PER ROUND</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <div style={{ display: "flex", border: "1px solid rgba(139,94,60,0.5)", background: "rgb(252,248,237)" }}>
              {[1, 2, 3, 4, 5].map((n, i) => (
                <button key={n} type="button" onClick={() => setMaxRounds(n)} style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.14em", padding: "8px 16px", border: "none", borderLeft: i > 0 ? "1px solid rgba(139,94,60,0.3)" : "none", cursor: "pointer", background: maxRounds === n ? "rgb(255,107,74)" : "transparent", color: maxRounds === n ? "rgb(46,42,32)" : "rgba(46,42,32,0.75)", transition: "background 0.15s" }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.14em", color: "rgba(46,42,32,0.45)" }}>NUMBER OF ROUNDS</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Debater cards */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", gap: 18 }}>
            <DebaterCardWithDropdown
              label="DEBATER A"
              accentColor="rgb(59,110,140)"
              vendor={debaterAVendor}
              tier={tier}
              image={DEBATER_A_IMG}
              open={dropA.open}
              dropdownRef={dropA.ref}
              onToggle={() => { dropB.setOpen(false); dropJ.setOpen(false); dropA.setOpen(o => !o); }}
              onPick={pickA}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 28, color: "rgba(46,42,32,0.4)", padding: "0 2px", paddingTop: 32 }}>v.</div>
            <DebaterCardWithDropdown
              label="DEBATER B"
              accentColor="rgb(168,92,52)"
              vendor={debaterBVendor}
              tier={tier}
              image={DEBATER_B_IMG}
              open={dropB.open}
              dropdownRef={dropB.ref}
              onToggle={() => { dropA.setOpen(false); dropJ.setOpen(false); dropB.setOpen(o => !o); }}
              onPick={pickB}
            />
          </div>

          {/* Judge — The Desk */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
            <div style={{ position: "relative", flex: "0 1 320px", minWidth: 260 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginBottom: 9 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.25em", color: "rgb(224,81,47)" }}>THE DESK</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.12em", color: "rgba(46,42,32,0.5)", border: "1px solid rgba(255,107,74,0.4)", padding: "1px 6px" }}>RECOMMENDED · NOT DEBATING</span>
              </div>
              <div ref={dropJ.ref} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => { dropA.setOpen(false); dropB.setOpen(false); dropJ.setOpen(o => !o); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%", background: "linear-gradient(rgb(252,248,237), rgb(243,236,218))", border: "1px solid rgba(255,107,74,0.55)", padding: "14px 16px", boxShadow: "rgba(255,255,255,0.6) 0px 1px 0px inset", boxSizing: "border-box", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "50%", background: "rgb(252,248,237)", border: "2px solid rgb(255,107,74)", overflow: "hidden", flexShrink: 0 }}>
                    <img src="/assets/teacher/headshot.png" alt="" style={avatarImgStyle} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1, flex: 1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <VendorIcon vendor={judgeVendor} size={18} color={VENDOR_ICON_COLOR[judgeVendor]} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "rgba(46,42,32,0.55)", textTransform: "uppercase" }}>{VENDOR_NAME[judgeVendor]}</span>
                    </span>
                    <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 17, lineHeight: 1.1, color: "rgb(46,42,32)" }}>{JUDGE_DISPLAY[judgeVendor][tier]}</span>
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(224,81,47,0.8)" }}>▾</span>
                </button>

                {dropJ.open && (
                  <div style={dropdownPanelStyle}>
                    {VENDORS.map((v) => {
                      const isSelected = v === judgeVendor;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => { setJudgeVendor(v); dropJ.setOpen(false); }}
                          style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 14px", border: "none", borderTop: "1px solid rgba(139,94,60,0.15)", background: isSelected ? "rgba(255,107,74,0.12)" : "transparent", cursor: "pointer", textAlign: "left" }}
                        >
                          <VendorIcon vendor={v} size={20} color={VENDOR_ICON_COLOR[v]} />
                          <span style={{ flex: 1 }}>
                            <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.18em", color: "rgba(46,42,32,0.5)", textTransform: "uppercase" }}>{VENDOR_NAME[v]}</span>
                            <span style={{ display: "block", fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 14, lineHeight: 1.2, color: "rgb(46,42,32)", marginTop: 1 }}>{JUDGE_DISPLAY[v][tier]}</span>
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.14em", color: isSelected ? "rgb(224,81,47)" : "rgba(46,42,32,0.4)" }}>
                            {isSelected ? "selected" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Question box */}
          <div style={{ marginTop: 44, background: "rgb(252,248,237)", border: "1px solid rgba(139,94,60,0.5)", boxShadow: "rgba(46,42,32,0.4) 0px 20px 50px -26px", padding: "22px 24px", boxSizing: "border-box" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.25em", color: "rgba(46,42,32,0.55)", marginBottom: 12 }}>TODAY&apos;S CASE</div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="State the question the two sides should debate…"
              rows={3}
              required
              style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none", outline: "none", resize: "vertical", fontFamily: "var(--font-serif)", fontSize: 17.5, lineHeight: 1.6, color: "rgb(46,42,32)", padding: 0 }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 16 }}>
              {examples.map((q) => (
                <button key={q} type="button" onClick={() => setQuestion(q)} style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", color: "rgba(46,42,32,0.65)", background: "rgba(124,148,115,0.1)", border: "1px solid rgba(139,94,60,0.3)", padding: "6px 12px", cursor: "pointer" }}>
                  {q}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(46,42,32,0.15)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "rgba(46,42,32,0.45)" }}>{question.length} CHARACTERS</span>
              <button
                type="submit"
                disabled={!question.trim()}
                style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 14, letterSpacing: "0.1em", background: question.trim() ? "rgb(255,107,74)" : "rgba(255,107,74,0.4)", color: "rgb(46,42,32)", border: "1px solid rgb(224,81,47)", padding: "12px 24px", cursor: question.trim() ? "pointer" : "default", boxShadow: question.trim() ? "rgba(255,107,74,0.6) 0px 10px 24px -12px" : "none", transition: "background 0.15s, box-shadow 0.15s" }}
              >
                ENTER THE CLASSROOM
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  width: "100%",
  background: "linear-gradient(rgb(252,248,237), rgb(243,236,218))",
  border: "1px solid rgba(139,94,60,0.4)",
  padding: "20px 16px 16px",
  boxShadow: "rgba(255,255,255,0.6) 0px 1px 0px inset",
  boxSizing: "border-box",
};

const avatarStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 80,
  height: 80,
  borderRadius: "50%",
  overflow: "hidden",
  background: "rgb(234,225,201)",
};

const avatarImgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "50% 30%",
};

const dropdownPanelStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 2px)",
  left: 0,
  right: 0,
  background: "rgb(252,248,237)",
  border: "1px solid rgba(139,94,60,0.4)",
  boxShadow: "rgba(46,42,32,0.18) 0px 12px 32px -16px",
  zIndex: 50,
};
