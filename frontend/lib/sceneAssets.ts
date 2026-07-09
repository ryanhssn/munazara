export const EXPRESSIONS = [
  "neutral",
  "speaking",
  "listening",
  "thinking",
  "agreeing",
  "disagreeing",
  "victorious",
  "disappointed",
] as const;

export type ExpressionState = (typeof EXPRESSIONS)[number];
export type CharacterRole = "debater_a" | "debater_b" | "teacher";

// teacher has no "disappointed" asset — falls back to "neutral"
export const ASSET_MAP = {
  classroom: "/assets/classroom.jpg",

  desks: {
    teacher: "/assets/desk-teacher.png",
    left: "/assets/debater-a.png",   // Left Student Desk (angled)
    right: "/assets/debater-b.png",  // Right Student Desk (angled)
  },

  characters: {
    debater_a: {
      neutral:      "/assets/debater-a/nuetral.png",
      speaking:     "/assets/debater-a/speaking.png",
      listening:    "/assets/debater-a/listening.png",
      thinking:     "/assets/debater-a/thinking.png",
      agreeing:     "/assets/debater-a/agreeing.png",
      disagreeing:  "/assets/debater-a/disagreeing.png",
      victorious:   "/assets/debater-a/victorious.png",
      disappointed: "/assets/debater-a/disappointed.png",
    },
    debater_b: {
      neutral:      "/assets/debater-b/nuetral.png",
      speaking:     "/assets/debater-b/speaking.png",
      listening:    "/assets/debater-b/listening.png",
      thinking:     "/assets/debater-b/thinking.png",
      agreeing:     "/assets/debater-b/agreeing.png",
      disagreeing:  "/assets/debater-b/disagreeing.png",
      victorious:   "/assets/debater-b/victorious.png",
      disappointed: "/assets/debater-b/disappointed.png",
    },
    teacher: {
      neutral:      "/assets/teacher/neutral.png",
      speaking:     "/assets/teacher/speaking.png",
      listening:    "/assets/teacher/listening.png",
      thinking:     "/assets/teacher/thinking.png",
      agreeing:     "/assets/teacher/agreeing.png",
      disagreeing:  "/assets/teacher/disagreeing.png",
      victorious:   "/assets/teacher/victorious.png",
      disappointed: "/assets/teacher/neutral.png", // no asset; falls back to neutral
    },
  },
} satisfies {
  classroom: string;
  desks: Record<"teacher" | "left" | "right", string>;
  characters: Record<CharacterRole, Record<ExpressionState, string>>;
};
