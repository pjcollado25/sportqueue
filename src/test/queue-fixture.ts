import { createDemoState } from "@/lib/defaults";
import type { AppState, PlayFormat, Sport } from "@/lib/types";

/** Multi-sport queue data for domain tests — not used in the live demo. */
export function createMultiSportQueueState(): AppState {
  const base = createDemoState();
  const sport = (
    id: string,
    name: string,
    icon: string,
    formats: PlayFormat[],
    enabled = true,
  ): Sport => ({
    id,
    name,
    icon,
    enabled,
    formats,
    defaultGroupSize: { singles: 1, doubles: 2, team: 4 },
    defaultMatchMinutes: 30,
    builtIn: true,
  });

  return {
    ...base,
    sports: [
      ...base.sports.filter((item) => item.id === "pickleball"),
      sport("tennis", "Tennis", "🎾", ["singles", "doubles"]),
      sport("volleyball", "Volleyball", "🏐", ["team"]),
    ],
    entries: [
      {
        id: "entry-alex",
        sportId: "pickleball",
        format: "doubles",
        displayName: "Alex",
        players: ["Alex", "Mina"],
        courtPreferenceId: "court-1",
        status: "waiting",
        joinedAt: base.entries[0]?.joinedAt ?? new Date().toISOString(),
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
        joinedAt: base.entries[0]?.joinedAt ?? new Date().toISOString(),
        courtId: null,
        ownerToken: null,
      },
      {
        id: "entry-jordan",
        sportId: "tennis",
        format: "singles",
        displayName: "Jordan",
        players: ["Jordan"],
        courtPreferenceId: null,
        status: "called",
        joinedAt: base.entries[0]?.joinedAt ?? new Date().toISOString(),
        calledAt: base.entries[0]?.joinedAt ?? new Date().toISOString(),
        courtId: "court-3",
        ownerToken: null,
      },
    ],
    courts: [
      ...base.courts.slice(0, 4),
      { id: "court-3", name: "Court 3", sportIds: ["tennis"], closed: false },
    ],
  };
}
