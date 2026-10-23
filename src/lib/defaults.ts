import { sanitizeAppState } from "@/lib/validation";
import type { AppState, Court, PlayFormat, Sport } from "@/lib/types";
import { defaultSessionSettings } from "@/lib/types";

function sport(
  id: string,
  name: string,
  icon: string,
  formats: PlayFormat[],
  defaultGroupSize: Sport["defaultGroupSize"],
  defaultMatchMinutes: number,
): Sport {
  return {
    id,
    name,
    icon,
    enabled: true,
    formats,
    defaultGroupSize,
    defaultMatchMinutes,
    builtIn: true,
  };
}

/** Empty venue + pickleball courts — no example players or game history. */
export function createInitialState(): AppState {
  const sports: Sport[] = [
    sport("pickleball", "Pickleball", "🏓", ["singles", "doubles"], { singles: 1, doubles: 2 }, 15),
  ];

  const courts: Court[] = [
    { id: "court-1", name: "Court 1", sportIds: ["pickleball"], closed: false },
    { id: "court-2", name: "Court 2", sportIds: ["pickleball"], closed: false },
    { id: "court-3", name: "Court 3", sportIds: ["pickleball"], closed: false },
    { id: "court-4", name: "Court 4", sportIds: ["pickleball"], closed: false },
  ];

  const raw: AppState = {
    version: 3,
    venue: { name: "Riverside Courts" },
    sports,
    courts,
    players: [],
    session: defaultSessionSettings(),
    partnerHistory: [],
    playSession: null,
    entries: [],
  };

  return sanitizeAppState(raw);
}

/** @deprecated Use createInitialState — kept for tests and store reset. */
export const createDemoState = createInitialState;
