"use client";

import Image from "next/image";
import { ASSET_MAP, EXPRESSIONS } from "@/lib/sceneAssets";
import type { DebaterConfig, JudgeConfig } from "./types";
import DebaterCard from "./DebaterCard";
import JudgeDeskCard from "./JudgeDeskCard";

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

export default function ClassroomScene({ debaterA, debaterB, judge }: Props) {
  return (
    /*
     * Outer wrapper fills remaining viewport height (flex: 1).
     * NO overflow:hidden here — cards must not be clipped.
     * Background gets its own overflow:hidden layer beneath everything.
     */
    <div style={{ position: "relative", flex: "1 1 0", minHeight: 420 }}>

      {/* ── Layer 0: Classroom background (clipped to its own bounds) ── */}
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
        }}
      >
        <div style={{ width: "100%" }}>
          <DebaterCard debater={debaterA} />
        </div>
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
        {/* -8vw ≈ -38% of 21vw column — desk overlaps character bottom */}
        <div style={{ width: "74%", marginTop: "-8vw", position: "relative", zIndex: 2 }}>
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

      {/* ── Teacher station: card → 12px gap → character → desk, centered ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "24%",
          width: "22%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 3,
        }}
      >
        <div style={{ width: "100%" }}>
          <JudgeDeskCard judge={judge} />
        </div>
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
        {/* -7.6vw ≈ -38% of 20vw column — desk overlaps character bottom */}
        <div style={{ width: "85%", marginTop: "-7.6vw", position: "relative", zIndex: 2 }}>
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
        }}
      >
        <div style={{ width: "100%" }}>
          <DebaterCard debater={debaterB} />
        </div>
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
        {/* -8vw ≈ -38% of 21vw column — desk overlaps character bottom */}
        <div style={{ width: "74%", marginTop: "-8vw", position: "relative", zIndex: 2 }}>
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
    </div>
  );
}
