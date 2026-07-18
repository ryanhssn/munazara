"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type FormEvent } from "react";
import type { DebateConfig } from "@/hooks/useDebateStream";
import type { Vendor } from "@/components/DebateRoom/types";
import VendorIcon, { VENDOR_ICON_COLOR } from "@/components/DebateRoom/VendorIcon";
import { JUDGE_DISPLAY, DEBATER_DISPLAY } from "@/lib/models";
import { pickRandom } from "@/lib/questions";

interface Props {
  onStart: (config: DebateConfig) => void;
  historySection?: React.ReactNode;
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
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: "relative", flex: "1 1 240px", minWidth: 230, maxWidth: 300, zIndex: open ? 40 : "auto" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.25em", color: accentColor, textAlign: "center", marginBottom: 9 }}>
        {label}
      </div>
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <div
          onClick={onToggle}
          style={{
            ...cardStyle,
            cursor: "pointer",
            transform: hovered ? "translateY(-6px)" : "translateY(0)",
            boxShadow: hovered
              ? `var(--shadow-3), var(--inset-highlight), 0 0 0 1.5px ${accentColor}40`
              : "var(--shadow-2), var(--inset-highlight)",
            transition: "transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s ease",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span style={{
            ...avatarStyle,
            border: `2px solid ${accentColor}`,
            transform: hovered ? "scale(1.08)" : "scale(1)",
            transition: "transform 0.22s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <img src={image} alt="" style={avatarImgStyle} />
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <VendorIcon vendor={vendor} size={20} color={VENDOR_ICON_COLOR[vendor]} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--ink-soft)", textTransform: "uppercase" }}>
              {VENDOR_NAME[vendor]}
            </span>
          </span>
          <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 18, lineHeight: 1.1, color: "var(--ink)" }}>
            {DEBATER_DISPLAY[vendor][tier]}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "var(--accent)" }}>
            CHANGE ▾
          </span>
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
                    borderTop: "1px solid var(--glass-border)",
                    background: selected ? "var(--accent-tint)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <VendorIcon vendor={v} size={20} color={VENDOR_ICON_COLOR[v]} />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.18em", color: "var(--muted)", textTransform: "uppercase" }}>
                      {VENDOR_NAME[v]}
                    </span>
                    <span style={{ display: "block", fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 14, lineHeight: 1.2, color: "var(--ink)", marginTop: 1 }}>
                      {DEBATER_DISPLAY[v][tier]}
                    </span>
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.14em", color: selected ? "var(--accent)" : "transparent" }}>
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

export default function SetupForm({ onStart, historySection }: Props) {
  const [question, setQuestion] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  useEffect(() => { setExamples(pickRandom(4)); }, []);
  const [tier, setTier] = useState<"fast" | "balanced" | "deep">("balanced");
  const [maxRounds, setMaxRounds] = useState(3);
  const [debaterAVendor, setDebaterAVendor] = useState<Vendor>("openai");
  const [debaterBVendor, setDebaterBVendor] = useState<Vendor>("google");
  const [judgeVendor, setJudgeVendor] = useState<Vendor>("anthropic");
  const [showWordmarkInfo, setShowWordmarkInfo] = useState(false);

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
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", color: "var(--ink)", fontFamily: "var(--font-serif)" }}>
      {/* Classroom background with heavy blur */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
        <img
          src="/assets/classroom.jpg"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "50% 28%",
            filter: "blur(28px) saturate(0.8) brightness(0.82)",
            transform: "scale(1.08)",
          }}
        />
        {/* warm tint overlay matching the app palette */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(252, 242, 228, 0.45)" }} />
      </div>
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "clamp(30px, 5vw, 64px) 20px 80px", position: "relative", zIndex: 1 }}>

        {/* Wordmark */}
        <div className="mz-stagger-1" style={{ position: "relative", textAlign: "center", paddingTop: 10 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(32px, 5vw, 44px)", letterSpacing: "0.24em", textIndent: "0.24em", color: "var(--ink)" }}>MUNAZARA</div>
            <button
              type="button"
              onMouseEnter={() => setShowWordmarkInfo(true)}
              onMouseLeave={() => setShowWordmarkInfo(false)}
              style={{ position: "absolute", top: 4, right: -14, background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 13, lineHeight: 1, padding: 2, opacity: 0.75 }}
            >
              ✦
            </button>
            {showWordmarkInfo && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                left: "50%",
                transform: "translateX(-50%)",
                minWidth: 300,
                maxWidth: "min(400px, 90vw)",
                background: "rgba(255, 252, 242, 0.97)",
                backdropFilter: "blur(var(--glass-blur-md)) saturate(160%)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-2)",
                padding: "12px 16px",
                zIndex: 60,
                textAlign: "left",
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                lineHeight: 1.65,
                color: "var(--ink-soft)",
                pointerEvents: "none",
              }}>
                Munazara (مناظرہ) is an Urdu and Arabic term referring to a formal, structured debate — historically used for scholarly and religious discourse. The name reflects the app&apos;s purpose: structured, rule-based debates between AI agents.
              </div>
            )}
          </div>
          <div style={{ fontFamily: "var(--font-arabic)", fontSize: 19, color: "var(--muted)", marginTop: 2 }}>مناظرہ</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", color: "var(--muted)", textTransform: "uppercase", marginTop: 14 }}>
            Multi-agent AI debate platform where Agents clash on structured topics.
          </div>
        </div>

        {/* Divider */}
        <div className="mz-stagger-2" style={{ display: "flex", alignItems: "center", gap: 14, margin: "36px 0 24px" }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, var(--glass-border))" }} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.25em", color: "var(--accent)" }}>SET UP THE DISCUSSION</div>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, var(--glass-border))" }} />
        </div>

        {/* Tier + Rounds */}
        <div className="mz-stagger-3" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, marginBottom: 30 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <div style={{ display: "flex", position: "relative", border: "1px solid var(--glass-border)", background: "var(--glass-fill-1)", backdropFilter: "blur(var(--glass-blur-sm)) saturate(160%)", borderRadius: "var(--radius-pill)", overflow: "hidden", boxShadow: "var(--shadow-1), var(--inset-highlight)" }}>
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: "33.333%", height: "100%",
                background: "var(--accent-glass)",
                borderRadius: "var(--radius-pill)",
                transform: `translateX(${["fast", "balanced", "deep"].indexOf(tier) * 100}%)`,
                transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
                pointerEvents: "none",
              }} />
              {(["fast", "balanced", "deep"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTier(t)} style={{ position: "relative", zIndex: 1, flex: 1, fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.14em", padding: "9px 20px", border: "none", cursor: "pointer", background: "transparent", color: tier === t ? "var(--white)" : "var(--ink-soft)", transition: "color 0.2s ease" }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "var(--tracking-label)", color: "var(--muted)" }}>THINKING DEPTH PER ROUND</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <div style={{ display: "flex", position: "relative", border: "1px solid var(--glass-border)", background: "var(--glass-fill-1)", backdropFilter: "blur(var(--glass-blur-sm)) saturate(160%)", borderRadius: "var(--radius-pill)", overflow: "hidden", boxShadow: "var(--shadow-1), var(--inset-highlight)" }}>
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: "20%", height: "100%",
                background: "var(--accent-glass)",
                borderRadius: "var(--radius-pill)",
                transform: `translateX(${(maxRounds - 1) * 100}%)`,
                transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
                pointerEvents: "none",
              }} />
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setMaxRounds(n)} style={{ position: "relative", zIndex: 1, flex: 1, fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.14em", padding: "9px 18px", border: "none", cursor: "pointer", background: "transparent", color: maxRounds === n ? "var(--white)" : "var(--ink-soft)", transition: "color 0.2s ease" }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "var(--tracking-label)", color: "var(--muted)" }}>NUMBER OF ROUNDS</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Debater cards */}
          <div className="mz-stagger-4" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", gap: 18 }}>
            <DebaterCardWithDropdown
              label="DEBATER A"
              accentColor="var(--accent-blue)"
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
              accentColor="var(--mz-b)"
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
          <div className="mz-stagger-5" style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
            <div style={{ position: "relative", flex: "0 1 320px", minWidth: 260, zIndex: dropJ.open ? 40 : "auto" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginBottom: 9 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.25em", color: "var(--accent)" }}>THE DESK</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.12em", color: "var(--muted)", border: "1px solid var(--glass-border-accent)", padding: "1px 6px", borderRadius: "var(--radius-pill)" }}>RECOMMENDED · NOT DEBATING</span>
              </div>
              <div ref={dropJ.ref} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => { dropA.setOpen(false); dropB.setOpen(false); dropJ.setOpen(o => !o); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%", background: "var(--accent-tint-strong)", backdropFilter: "blur(var(--glass-blur-md)) saturate(160%)", border: "1px solid var(--glass-border-accent)", borderRadius: "var(--radius-xl)", padding: "14px 16px", boxShadow: "var(--shadow-2), var(--inset-highlight)", boxSizing: "border-box", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "50%", background: "var(--glass-fill-1)", border: "2px solid var(--accent)", overflow: "hidden", flexShrink: 0 }}>
                    <img src="/assets/teacher/headshot.png" alt="" style={avatarImgStyle} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1, flex: 1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <VendorIcon vendor={judgeVendor} size={18} color={VENDOR_ICON_COLOR[judgeVendor]} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "var(--ink-soft)", textTransform: "uppercase" }}>{VENDOR_NAME[judgeVendor]}</span>
                    </span>
                    <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 17, lineHeight: 1.1, color: "var(--ink)" }}>{JUDGE_DISPLAY[judgeVendor][tier]}</span>
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "var(--accent)" }}>▾</span>
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
                          style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 14px", border: "none", borderTop: "1px solid var(--glass-border)", background: isSelected ? "var(--accent-tint)" : "transparent", cursor: "pointer", textAlign: "left" }}
                        >
                          <VendorIcon vendor={v} size={20} color={VENDOR_ICON_COLOR[v]} />
                          <span style={{ flex: 1 }}>
                            <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.18em", color: "var(--muted)", textTransform: "uppercase" }}>{VENDOR_NAME[v]}</span>
                            <span style={{ display: "block", fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 14, lineHeight: 1.2, color: "var(--ink)", marginTop: 1 }}>{JUDGE_DISPLAY[v][tier]}</span>
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.14em", color: isSelected ? "var(--accent)" : "transparent" }}>
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
          <div className="mz-stagger-6" style={{ marginTop: 44, background: "var(--glass-fill-2)", backdropFilter: "blur(var(--glass-blur-lg)) saturate(160%)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-2), var(--inset-highlight)", padding: "var(--space-8) var(--space-6)", boxSizing: "border-box" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "var(--tracking-label)", color: "var(--muted)", marginBottom: 12, textTransform: "uppercase" }}>Today&apos;s Case</div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="State the question the two sides should debate…"
              rows={3}
              required
              style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none", outline: "none", resize: "vertical", fontFamily: "var(--font-serif)", fontSize: 17.5, lineHeight: 1.6, color: "var(--ink)", padding: 0 }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 16 }}>
              {examples.map((q) => (
                <button key={q} type="button" onClick={() => setQuestion(q)} style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", color: "var(--ink-soft)", background: "var(--glass-fill-1)", backdropFilter: "blur(var(--glass-blur-sm)) saturate(160%)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-pill)", padding: "6px 14px", cursor: "pointer" }}>
                  {q}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--glass-border)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "var(--tracking-label)", color: "var(--muted)" }}>{question.length} CHARACTERS</span>
              <button
                type="submit"
                disabled={!question.trim()}
                style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 14, letterSpacing: "0.1em", background: question.trim() ? "var(--accent-fill)" : "rgba(207,90,53,0.15)", backdropFilter: "blur(var(--glass-blur-sm)) saturate(160%)", color: question.trim() ? "var(--ink)" : "var(--muted)", border: "1px solid var(--accent)", borderRadius: "var(--radius-pill)", padding: "12px 28px", cursor: "pointer", boxShadow: question.trim() ? "var(--shadow-accent)" : "none", transition: "background 0.15s, box-shadow 0.15s, color 0.15s" }}
              >
                ENTER THE CLASSROOM
              </button>
            </div>
          </div>

        </form>

        {historySection}

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
  background: "var(--glass-fill-2)",
  backdropFilter: "blur(var(--glass-blur-lg)) saturate(160%)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-xl)",
  padding: "20px 16px 16px",
  boxShadow: "var(--shadow-2), var(--inset-highlight)",
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
  background: "var(--glass-fill-1)",
};

const avatarImgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "50% 30%",
};

const dropdownPanelStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  background: "rgba(255, 251, 244, 0.98)",
  backdropFilter: "blur(var(--glass-blur-lg)) saturate(160%)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-3)",
  zIndex: 60,
  overflow: "hidden",
};
