"use client";

import React from "react";
import Image from "next/image";
import { ASSET_MAP, EXPRESSIONS } from "@/lib/sceneAssets";
import type { DebaterConfig, JudgeConfig, Vendor } from "./types";
import DebaterCard from "./DebaterCard";
import JudgeDeskCard from "./JudgeDeskCard";
import VendorIcon, { VENDOR_COLOR, VENDOR_ICON_COLOR } from "./VendorIcon";

interface Props {
  debaterA: DebaterConfig;
  debaterB: DebaterConfig;
  judge: JudgeConfig;
  onTakeaway?: () => void;
  debaterACardRef?: React.RefObject<HTMLDivElement | null>;
  debaterBCardRef?: React.RefObject<HTMLDivElement | null>;
  hiddenSpeaker?: "debater_a" | "debater_b";
  /* CSS length reserved on the right for the overlaying log panel, so the
   * character stage centers in the visible area instead of under the panel. */
  rightInset?: string;
}

function CharacterSprite({
  role,
  expression,
  alt,
  sizes = "15vw",
}: {
  role: "debater_a" | "debater_b" | "teacher";
  expression: string;
  alt: string;
  sizes?: string;
}) {
  const assets = ASSET_MAP.characters[role];
  return (
    // paddingBottom reserves the height so the slot never collapses — prevents layout jump
    <div style={{ position: "relative", width: "100%", paddingBottom: "140%" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        {EXPRESSIONS.map((expr) => (
          <Image
            key={expr}
            src={assets[expr]}
            alt={`${alt} ${expr}`}
            fill
            sizes={sizes}
            priority={expr === "neutral"}
            style={{
              objectFit: "contain",
              objectPosition: "bottom center",
              opacity: expr === expression ? 1 : 0,
              transition: "opacity 0.25s ease-in-out",
              willChange: "opacity",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const ACTIVE_EXPRESSIONS = new Set(["speaking", "agreeing", "disagreeing"]);
const JUDGE_ACTIVE = new Set(["speaking", "victorious"]);
const JUDGE_PROCESSING = new Set(["thinking", "agreeing", "disagreeing"]);

function ThinkingBubble({ vendor }: { vendor: Vendor }) {
  const color = VENDOR_COLOR[vendor];
  return (
    <div
      style={{
        width: "100%",
        background: "var(--mz-card)",
        borderWidth: "3px 1px 1px",
        borderStyle: "solid",
        borderColor: `${color} var(--mz-border) var(--mz-border)`,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {[0, 0.3, 0.6].map((delay, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: color,
            animation: `mzBlink 1.2s ${delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

const STAGE_TRANSITION = "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.45s ease, filter 0.45s ease";

function stageStyle(
  role: "a" | "b" | "judge",
  activeSpeaker: "a" | "b" | "judge" | null,
): React.CSSProperties {
  const base: React.CSSProperties = { transition: STAGE_TRANSITION, transformOrigin: "bottom center" };
  if (!activeSpeaker) return base;
  if (role === activeSpeaker) {
    return { ...base, transform: "scale(1.1) translateY(-2%)", opacity: 1, filter: "none", zIndex: 6 };
  }
  return { ...base, transform: "scale(0.84) translateY(1%)", opacity: 0.52, filter: "brightness(0.82) saturate(0.6)" };
}

export default function ClassroomScene({ debaterA, debaterB, judge, onTakeaway, debaterACardRef, debaterBCardRef, hiddenSpeaker, rightInset = "0px" }: Props) {
  const activeSpeaker: "a" | "b" | "judge" | null =
    debaterA.expression === "speaking" ? "a" :
    debaterB.expression === "speaking" ? "b" :
    judge.expression === "speaking" ? "judge" : null;

  return (
    /*
     * Outer wrapper fills remaining viewport height (flex: 1).
     * NO overflow:hidden here — cards must not be clipped.
     * Background gets its own overflow:hidden layer beneath everything.
     */
    <div style={{ position: "relative", flex: "1 1 0", minHeight: 420 }}>

      {/* ── Layer 0: Classroom background — bleeds full width beyond 1750px ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
        <Image
          src={ASSET_MAP.classroom}
          alt="Classroom"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "50% 28%" }}
        />
      </div>

      {/*
       * ── Character stage: capped at 1750px, centered in the VISIBLE area ──
       * `right: rightInset` reserves the log panel's width so the stage centers
       * in the space left of the panel — debaters never render underneath it.
       * Characters use % positions relative to this inner box, so they don't
       * drift when the outer container grows wider.
       */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: rightInset,
          top: 0,
          bottom: 0,
          maxWidth: 1750,
          margin: "0 auto",
          zIndex: 1,
        }}
      >

      {/* ── Debater A station: card → 12px gap → character → desk ── */}
      <div
        style={{
          position: "absolute",
          left: "8%",
          bottom: "2%",
          width: "21%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 4,
          ...stageStyle("a", activeSpeaker),
        }}
      >
        {ACTIVE_EXPRESSIONS.has(debaterA.expression) ? (
          <div
            ref={debaterACardRef}
            style={{
              width: "100%",
              opacity: hiddenSpeaker === "debater_a" ? 0 : 1,
              transition: "opacity 0.22s ease",
            }}
          >
            <DebaterCard debater={debaterA} isActive={activeSpeaker === "a"} />
          </div>
        ) : debaterA.expression === "thinking" ? (
          <div style={{ width: "100%" }}>
            <ThinkingBubble vendor={debaterA.vendor} />
          </div>
        ) : null}
        {/* 12px fixed gap between card and character */}
        <div style={{ height: 12 }} />
        <div
          style={{
            position: "relative",
            width: "60%",
            transition: "filter 0.5s ease",
            ...(debaterA.expression === "speaking"
              ? { animation: "mzGlowA 2s ease-in-out infinite" }
              : debaterA.expression === "agreeing"
              ? { filter: "none", animation: "mzVictoryFloat 2.8s ease-in-out infinite" }
              : { filter: "none" }
            ),
          }}
        >
          <CharacterSprite
            role="debater_a"
            expression={debaterA.expression}
            alt="Debater A"
            sizes="14vw"
          />
        </div>
        {/* cap at -140px = -8vw@1750 so desk overlap doesn't grow past container max-width */}
        <div style={{ width: "74%", marginTop: "max(-140px, -8vw)", position: "relative", zIndex: 2 }}>
          <Image
            src={ASSET_MAP.desks.left}
            alt="Debater A desk"
            width={400}
            height={200}
            priority
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          <div style={{
            position: "absolute",
            top: "18%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(252,248,237,0.92)",
            border: `1.5px solid ${VENDOR_COLOR[debaterA.vendor]}`,
            borderRadius: 6,
            padding: "3px 7px",
            display: "flex",
            alignItems: "center",
            gap: 5,
            boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
            whiteSpace: "nowrap",
          }}>
            <VendorIcon vendor={debaterA.vendor} size={13} color={VENDOR_ICON_COLOR[debaterA.vendor]} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.1em", color: VENDOR_COLOR[debaterA.vendor] }}>
              {debaterA.model}
            </span>
          </div>
        </div>
      </div>

      {/* ── Teacher station: outer div handles centering only; inner div handles scale ──
          left is nudged right by half the reserved panel width so she lands on the
          room's true center (the stage box is offset left by that panel reserve). */}
      <div
        style={{
          position: "absolute",
          left: `calc(50% + (${rightInset} / 3.5))`,
          bottom: "24%",
          width: "22%",
          transform: "translateX(-50%)",
          zIndex: 3,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            ...stageStyle("judge", activeSpeaker),
          }}
        >
          {JUDGE_ACTIVE.has(judge.expression) ? (
            <div style={{ width: "100%" }}>
              <JudgeDeskCard judge={judge} onTakeaway={onTakeaway} />
            </div>
          ) : JUDGE_PROCESSING.has(judge.expression) ? (
            <div style={{ width: "100%" }}>
              <ThinkingBubble vendor={judge.vendor} />
            </div>
          ) : null}
          {/* 12px fixed gap between card and character */}
          <div style={{ height: 12 }} />
          <div
            style={{
              position: "relative",
              width: "65%",
              transition: "filter 0.5s ease",
              ...(judge.expression === "speaking"
                ? { animation: "mzGlowJ 2s ease-in-out infinite" }
                : judge.expression === "victorious"
                ? { animation: "mzGlowJ 2s ease-in-out infinite, mzVictoryFloat 2.8s ease-in-out 0.2s infinite" }
                : { filter: "none" }
              ),
            }}
          >
            <CharacterSprite
              role="teacher"
              expression={judge.expression}
              alt="Judge"
              sizes="14vw"
            />
          </div>
          {/* cap at -133px = -7.6vw@1750 */}
          <div style={{ width: "85%", marginTop: "max(-133px, -7.6vw)", position: "relative", zIndex: 2 }}>
            <Image
              src={ASSET_MAP.desks.teacher}
              alt="Teacher's desk"
              width={400}
              height={200}
              priority
              style={{ width: "100%", height: "auto", display: "block" }}
            />
            <div style={{
              position: "absolute",
              top: "18%",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(252,248,237,0.92)",
              border: `1.5px solid ${VENDOR_COLOR[judge.vendor]}`,
              borderRadius: 6,
              padding: "3px 7px",
              display: "flex",
              alignItems: "center",
              gap: 5,
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              whiteSpace: "nowrap",
            }}>
              <VendorIcon vendor={judge.vendor} size={13} color={VENDOR_ICON_COLOR[judge.vendor]} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.1em", color: VENDOR_COLOR[judge.vendor] }}>
                {judge.model}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Debater B station: card → 12px gap → character → desk ──
          right:8% mirrors Debater A's left:8% — pulled in toward the teacher.
          The stage box already reserves the panel width. */}
      <div
        style={{
          position: "absolute",
          right: "2%",
          bottom: "2%",
          width: "21%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 4,
          ...stageStyle("b", activeSpeaker),
        }}
      >
        {ACTIVE_EXPRESSIONS.has(debaterB.expression) ? (
          <div
            ref={debaterBCardRef}
            style={{
              width: "100%",
              opacity: hiddenSpeaker === "debater_b" ? 0 : 1,
              transition: "opacity 0.22s ease",
            }}
          >
            <DebaterCard debater={debaterB} isActive={activeSpeaker === "b"} />
          </div>
        ) : debaterB.expression === "thinking" ? (
          <div style={{ width: "100%" }}>
            <ThinkingBubble vendor={debaterB.vendor} />
          </div>
        ) : null}
        {/* 12px fixed gap between card and character */}
        <div style={{ height: 12 }} />
        <div
          style={{
            position: "relative",
            width: "60%",
            transition: "filter 0.5s ease",
            ...(debaterB.expression === "speaking"
              ? { animation: "mzGlowB 2s ease-in-out infinite" }
              : debaterB.expression === "agreeing"
              ? { filter: "none", animation: "mzVictoryFloat 2.8s ease-in-out infinite" }
              : { filter: "none" }
            ),
          }}
        >
          <CharacterSprite
            role="debater_b"
            expression={debaterB.expression}
            alt="Debater B"
            sizes="14vw"
          />
        </div>
        {/* cap at -140px = -8vw@1750 */}
        <div style={{ width: "74%", marginTop: "max(-140px, -8vw)", position: "relative", zIndex: 2 }}>
          <Image
            src={ASSET_MAP.desks.right}
            alt="Debater B desk"
            width={400}
            height={200}
            priority
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          <div style={{
            position: "absolute",
            top: "18%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(252,248,237,0.92)",
            border: `1.5px solid ${VENDOR_COLOR[debaterB.vendor]}`,
            borderRadius: 6,
            padding: "3px 7px",
            display: "flex",
            alignItems: "center",
            gap: 5,
            boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
            whiteSpace: "nowrap",
          }}>
            <VendorIcon vendor={debaterB.vendor} size={13} color={VENDOR_ICON_COLOR[debaterB.vendor]} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.1em", color: VENDOR_COLOR[debaterB.vendor] }}>
              {debaterB.model}
            </span>
          </div>
        </div>
      </div>

      </div>{/* end character stage */}
    </div>
  );
}
