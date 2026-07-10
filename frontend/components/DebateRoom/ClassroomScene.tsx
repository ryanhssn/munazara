"use client";

import React from "react";
import Image from "next/image";
import { ASSET_MAP, EXPRESSIONS } from "@/lib/sceneAssets";
import type { DebaterConfig, JudgeConfig, Vendor } from "./types";
import DebaterCard from "./DebaterCard";
import JudgeDeskCard from "./JudgeDeskCard";
import { VENDOR_COLOR } from "./VendorIcon";

interface Props {
  debaterA: DebaterConfig;
  debaterB: DebaterConfig;
  judge: JudgeConfig;
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

export default function ClassroomScene({ debaterA, debaterB, judge }: Props) {
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
       * ── Character stage: capped at 1750px, centered ──
       * Characters use % positions relative to this inner box,
       * so they don't drift when the outer container grows wider.
       */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          maxWidth: 1750,
          width: "100%",
          margin: "0 auto",
          zIndex: 1,
        }}
      >

      {/* ── Debater A station: card → 12px gap → character → desk ── */}
      <div
        style={{
          position: "absolute",
          left: "1%",
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
          <div style={{ width: "100%" }}>
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
            filter:
              debaterA.expression === "speaking"
                ? "drop-shadow(0 0 16px rgba(59,110,140,0.6))"
                : "none",
            transition: "filter 0.5s ease",
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
        </div>
      </div>

      {/* ── Teacher station: outer div handles centering only; inner div handles scale ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
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
              <JudgeDeskCard judge={judge} />
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
              filter:
                judge.expression === "speaking"
                  ? "drop-shadow(0 0 18px rgba(224,81,47,0.55))"
                  : "none",
              transition: "filter 0.5s ease",
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
          </div>
        </div>
      </div>

      {/* ── Debater B station: card → 12px gap → character → desk ── */}
      <div
        style={{
          position: "absolute",
          right: "1%",
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
          <div style={{ width: "100%" }}>
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
            filter:
              debaterB.expression === "speaking"
                ? "drop-shadow(0 0 16px rgba(168,92,52,0.6))"
                : "none",
            transition: "filter 0.5s ease",
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
        </div>
      </div>

      </div>{/* end character stage */}
    </div>
  );
}
