import type { AppState, Court, PlayFormat, Sport } from "@/lib/types";

const MINUTE = 60_000;

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

export function createDemoState(now = Date.now()): AppState {
  const at = (minutes: number) => new Date(now + minutes * MINUTE).toISOString();

  const sports: Sport[] = [
    sport("pickleball", "Pickleball", "🏓", ["singles", "doubles"], { singles: 1, doubles: 2 }, 15),
    sport("tennis", "Tennis", "🎾", ["singles", "doubles"], { singles: 1, doubles: 2 }, 60),
    sport("badminton", "Badminton", "🏸", ["singles", "doubles"], { singles: 1, doubles: 2 }, 20),
    sport("basketball", "Basketball", "🏀", ["team"], { team: 5 }, 40),
    sport("volleyball", "Volleyball", "🏐", ["team"], { team: 6 }, 30),
    sport("table-tennis", "Table tennis", "🏓", ["singles", "doubles"], { singles: 1, doubles: 2 }, 15),
    sport("other", "Other", "🏅", ["singles", "doubles", "team"], { singles: 1, doubles: 2, team: 4 }, 30),
  ];

  const courts: Court[] = [
    { id: "court-1", name: "Court 1", sportIds: ["pickleball"], closed: false },
    { id: "court-2", name: "Court 2", sportIds: ["pickleball"], closed: false },
    { id: "court-3", name: "Court 3", sportIds: ["tennis"], closed: false },
    { id: "court-4", name: "Court 4", sportIds: ["badminton"], closed: false },
    { id: "court-5", name: "Court 5", sportIds: ["basketball", "volleyball"], closed: false },
    { id: "table-1", name: "Table 1", sportIds: ["table-tennis"], closed: false },
  ];

  return {
    version: 1,
    venue: { name: "Riverside Courts" },
    sports,
    courts,
    entries: [
      {
        id: "entry-alex",
        sportId: "pickleball",
        format: "doubles",
        displayName: "Alex",
        players: ["Alex", "Mina"],
        courtPreferenceId: "court-1",
        status: "waiting",
        joinedAt: at(-20),
        courtId: null,
        ownerToken: null,
      },
      {
        id: "entry-chris",
        sportId: "pickleball",
        format: "singles",
        displayName: "Chris",
        players: ["Chris"],
        courtPreferenceId: null,
        status: "waiting",
        joinedAt: at(-6),
        courtId: null,
        ownerToken: null,
      },
      {
        id: "entry-jordan",
        sportId: "tennis",
        format: "singles",
        displayName: "Jordan",
        players: ["Jordan"],
        courtPreferenceId: "court-3",
        status: "called",
        joinedAt: at(-30),
        calledAt: at(-2),
        courtId: "court-3",
        ownerToken: null,
      },
      {
        id: "entry-priya",
        sportId: "badminton",
        format: "singles",
        displayName: "Priya",
        players: ["Priya"],
        courtPreferenceId: null,
        status: "playing",
        joinedAt: at(-40),
        calledAt: at(-18),
        startedAt: at(-15),
        courtId: "court-4",
        ownerToken: null,
      },
      {
        id: "entry-northside",
        sportId: "basketball",
        format: "team",
        displayName: "Northside",
        players: ["Northside"],
        courtPreferenceId: null,
        status: "completed",
        joinedAt: at(-100),
        calledAt: at(-95),
        startedAt: at(-90),
        endedAt: at(-50),
        courtId: "court-5",
        ownerToken: null,
      },
      {
        id: "entry-sam",
        sportId: "table-tennis",
        format: "singles",
        displayName: "Sam",
        players: ["Sam"],
        courtPreferenceId: null,
        status: "completed",
        joinedAt: at(-40),
        calledAt: at(-25),
        startedAt: at(-24),
        endedAt: at(-10),
        courtId: "table-1",
        ownerToken: null,
      },
    ],
  };
}
