export const SKILL_LEVELS = [
  "beginner",
  "advanced_beginner",
  "intermediate",
  "advanced_intermediate",
  "advanced",
  "expert",
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

const SKILL_LABELS: Record<SkillLevel, string> = {
  beginner: "Beginner",
  advanced_beginner: "Advanced beginner",
  intermediate: "Intermediate",
  advanced_intermediate: "Advanced intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

/** Short line shown under the star picker — not the same as rankings. */
const SKILL_HINTS: Record<SkillLevel, string> = {
  beginner: "New to the game",
  advanced_beginner: "Learning rallies and rules",
  intermediate: "Steady recreational play",
  advanced_intermediate: "Strong club / open play",
  advanced: "Competitive and consistent",
  expert: "Tournament-level pace",
};

export const SKILL_STAR_MAX = SKILL_LEVELS.length;

/** Estimated play levels for open play — not official rankings. */
export function skillLevelLabel(level: SkillLevel | null | undefined): string {
  if (!level) return "Unrated";
  return SKILL_LABELS[level];
}

export function skillLevelHint(level: SkillLevel | null | undefined): string {
  if (!level) return "Tap a star to set an estimated play level for balancing teams.";
  return SKILL_HINTS[level];
}

export function skillLevelStarCount(level: SkillLevel | null | undefined): number {
  if (!level) return 0;
  return SKILL_LEVELS.indexOf(level) + 1;
}

export function skillLevelFromStarCount(count: number): SkillLevel | null {
  if (count < 1 || count > SKILL_STAR_MAX) return null;
  return SKILL_LEVELS[count - 1];
}

export function skillLevelShort(level: SkillLevel | null | undefined): string {
  if (!level) return "Unrated";
  const stars = skillLevelStarCount(level);
  return `${stars}/${SKILL_STAR_MAX} · ${SKILL_LABELS[level]}`;
}

/** Numeric weight for pairing balance (1–6). Unrated uses the middle. */
export function skillLevelWeight(level: SkillLevel | null | undefined): number {
  if (!level) return 3.5;
  return SKILL_LEVELS.indexOf(level) + 1;
}

export function isSkillLevel(value: string): value is SkillLevel {
  return (SKILL_LEVELS as readonly string[]).includes(value);
}

export function playerNameKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function partnerHistoryKey(a: string, b: string): string {
  const left = a.trim().toLocaleLowerCase();
  const right = b.trim().toLocaleLowerCase();
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}
