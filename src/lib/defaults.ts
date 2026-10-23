import { ARCHIVED_SPORT_ID, archivedSport } from "@/lib/sports";
import { sanitizeAppState } from "@/lib/validation";
import type { AppState, Court, PlayFormat, Sport } from "@/lib/types";
import { defaultSessionSettings } from "@/lib/types";
import type { SkillLevel } from "@/lib/skill";

const MINUTE = 60_000;

function sport(
  id: string,
  name: string,
  icon: string,
  formats: PlayFormat[],
  defaultGroupSize: Sport["defaultGroupSize"],
  defaultMatchMinutes: number,
  enabled = true,
): Sport {
  return {
    id,
    name,
    icon,
    enabled,
    formats,
    defaultGroupSize,
    defaultMatchMinutes,
    builtIn: true,
  };
}

function samplePlayer(name: string, skillLevel: SkillLevel, order: number) {
  return {
    id: `player-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    skillLevel,
    checkInOrder: order,
    sitOutCount: 0,
    wins: 0,
    losses: 0,
    games: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  };
}

export function createDemoState(now = Date.now()): AppState {
  const at = (minutes: number) => new Date(now + minutes * MINUTE).toISOString();

  const sports: Sport[] = [
    sport("pickleball", "Pickleball", "🏓", ["singles", "doubles"], { singles: 1, doubles: 2 }, 15),
    archivedSport(),
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
    players: [
      samplePlayer("Alex", "advanced", 1),
      samplePlayer("Mina", "intermediate", 2),
      samplePlayer("Chris", "advanced_beginner", 3),
      samplePlayer("Dee", "expert", 4),
      samplePlayer("Ben", "intermediate", 5),
      samplePlayer("Cam", "beginner", 6),
    ],
    session: defaultSessionSettings(),
    partnerHistory: [],
    playSession: null,
    entries: [
      {
        id: "entry-legacy",
        sportId: ARCHIVED_SPORT_ID,
        format: "team",
        displayName: "Northside",
        players: ["Northside"],
        courtPreferenceId: null,
        status: "completed",
        joinedAt: at(-100),
        calledAt: at(-95),
        startedAt: at(-90),
        endedAt: at(-50),
        courtId: "court-4",
        ownerToken: null,
        winnerSide: "A",
      },
      {
        id: "entry-sam",
        sportId: "pickleball",
        format: "singles",
        displayName: "Sam",
        players: ["Sam"],
        courtPreferenceId: null,
        status: "completed",
        joinedAt: at(-40),
        calledAt: at(-25),
        startedAt: at(-24),
        endedAt: at(-10),
        courtId: "court-1",
        ownerToken: null,
        winnerSide: "A",
        scoreSideA: 11,
        scoreSideB: 7,
      },
    ],
  };

  return sanitizeAppState(raw);
}
