import type { Sport } from "@/lib/types";

/** Built-in sport removed from the app; history entries are migrated to {@link ARCHIVED_SPORT_ID}. */
export const RETIRED_SPORT_IDS = new Set(["basketball"]);

/** Placeholder sport for migrated history rows — not shown in settings. */
export const ARCHIVED_SPORT_ID = "archived";

export const DEFAULT_SESSION_SPORT_ID = "pickleball";

export function archivedSport(): Sport {
  return {
    id: ARCHIVED_SPORT_ID,
    name: "Past game",
    icon: "📋",
    enabled: false,
    formats: ["singles", "doubles", "team"],
    defaultGroupSize: { singles: 1, doubles: 2, team: 4 },
    defaultMatchMinutes: 30,
    builtIn: true,
  };
}

export function isSportSelectable(sport: Sport): boolean {
  return sport.enabled && !RETIRED_SPORT_IDS.has(sport.id) && sport.id !== ARCHIVED_SPORT_ID;
}

export function isRetiredSportId(sportId: string): boolean {
  return RETIRED_SPORT_IDS.has(sportId);
}

export function isArchivedSportId(sportId: string): boolean {
  return sportId === ARCHIVED_SPORT_ID;
}

/** Sports staff can manage in Settings (not retired / archive placeholders). */
export function manageableSports(sports: Sport[]): Sport[] {
  return sports.filter((sport) => !isRetiredSportId(sport.id) && !isArchivedSportId(sport.id));
}
