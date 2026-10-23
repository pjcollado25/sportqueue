import { z } from "zod";
import { SKILL_LEVELS } from "@/lib/skill";
import { ARCHIVED_SPORT_ID, archivedSport, isRetiredSportId, manageableSports } from "@/lib/sports";
import type { AppState } from "@/lib/types";
import { defaultSessionSettings, ENTRY_STATUSES, PLAY_FORMATS } from "@/lib/types";

const playFormatSchema = z.enum(PLAY_FORMATS);
const entryStatusSchema = z.enum(ENTRY_STATUSES);
const skillLevelSchema = z.enum(SKILL_LEVELS);

const sportSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(40),
  icon: z.string().trim().min(1).max(8),
  enabled: z.boolean(),
  formats: z.array(playFormatSchema).min(1).max(3),
  defaultGroupSize: z
    .object({
      singles: z.number().int().min(1).max(20).optional(),
      doubles: z.number().int().min(1).max(20).optional(),
      team: z.number().int().min(1).max(20).optional(),
    })
    .default({}),
  defaultMatchMinutes: z.number().int().min(5).max(240),
  builtIn: z.boolean(),
});

const courtSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(40),
  sportIds: z.array(z.string().min(1).max(80)).max(40),
  closed: z.boolean(),
});

const entrySchema = z.object({
  id: z.string().trim().min(1).max(80),
  sportId: z.string().trim().min(1).max(80),
  format: playFormatSchema,
  displayName: z.string().trim().min(1).max(40),
  players: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
  courtPreferenceId: z.string().min(1).max(80).nullable(),
  status: entryStatusSchema,
  joinedAt: z.string().min(1),
  calledAt: z.string().min(1).optional(),
  startedAt: z.string().min(1).optional(),
  endedAt: z.string().min(1).optional(),
  courtId: z.string().min(1).max(80).nullable(),
  ownerToken: z.string().min(1).max(80).nullable(),
  winnerSide: z.enum(["A", "B"]).nullable().optional(),
  scoreSideA: z.number().int().min(0).max(99).nullable().optional(),
  scoreSideB: z.number().int().min(0).max(99).nullable().optional(),
  resultUndo: z.any().nullable().optional(),
});

const playerSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(40),
  skillLevel: skillLevelSchema.nullable(),
  checkInOrder: z.number().int().min(0),
  sitOutCount: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  games: z.number().int().min(0),
  pointsFor: z.number().int().min(0),
  pointsAgainst: z.number().int().min(0),
});

const sessionSchema = z.object({
  minGamesForRanking: z.number().int().min(1).max(20),
});

const stagedSchema = z.object({
  sideA: z.tuple([z.string().min(1).max(40), z.string().min(1).max(40)]),
  sideB: z.tuple([z.string().min(1).max(40), z.string().min(1).max(40)]),
  sittingOut: z.string().min(1).max(40).nullable(),
  waitingPair: z.tuple([z.string().min(1).max(40), z.string().min(1).max(40)]).nullable(),
  revision: z.number().int().min(0),
});

const playSessionSchema = z.object({
  sportId: z.string().trim().min(1).max(80),
  format: playFormatSchema,
  courtIds: z.array(z.string().min(1).max(80)).min(1).max(24),
  startedAt: z.string().min(1),
  checkedInPlayerIds: z.array(z.string().min(1).max(80)).max(200),
  staged: stagedSchema.nullable(),
});

const appStateCore = {
  venue: z.object({
    name: z.string().trim().min(1).max(60),
  }),
  sports: z.array(sportSchema).min(1).max(40),
  courts: z.array(courtSchema).max(80),
  entries: z.array(entrySchema).max(500),
  players: z.array(playerSchema).max(200).default([]),
  session: sessionSchema.default(defaultSessionSettings()),
  partnerHistory: z.array(z.string().min(1).max(120)).max(2000).default([]),
  playSession: playSessionSchema.nullable().default(null),
};

const appStateSchemaV3 = z.object({
  version: z.literal(3),
  ...appStateCore,
});

const appStateSchemaV2 = z.object({
  version: z.literal(2),
  venue: appStateCore.venue,
  sports: appStateCore.sports,
  courts: appStateCore.courts,
  entries: appStateCore.entries,
  players: appStateCore.players,
  session: appStateCore.session,
  partnerHistory: appStateCore.partnerHistory,
});

const appStateSchemaV1 = z.object({
  version: z.literal(1),
  venue: z.object({
    name: z.string().trim().min(1).max(60),
  }),
  sports: z.array(sportSchema).min(1).max(40),
  courts: z.array(courtSchema).max(80),
  entries: z.array(entrySchema).max(500),
});

const BACKUP_ERROR = "This file is not a SportQueue backup. Use a file exported from SportQueue.";

/** Example games bundled in older builds — never treated as the user's history. */
const BUNDLED_DEMO_ENTRY_IDS = new Set([
  "entry-legacy",
  "entry-sam",
  "entry-alex",
  "entry-chris",
  "entry-jordan",
  "entry-priya",
  "entry-northside",
]);

export function sanitizeAppState(state: AppState): AppState {
  const entries = state.entries
    .filter((entry) => !BUNDLED_DEMO_ENTRY_IDS.has(entry.id))
    .map((entry) => (isRetiredSportId(entry.sportId) ? { ...entry, sportId: ARCHIVED_SPORT_ID } : entry));

  let sports = manageableSports(state.sports);
  if (entries.some((entry) => entry.sportId === ARCHIVED_SPORT_ID) && !sports.some((sport) => sport.id === ARCHIVED_SPORT_ID)) {
    sports = [...sports, archivedSport()];
  }

  const courts = state.courts.map((court) => {
    const sportIds = court.sportIds.filter((id) => !isRetiredSportId(id));
    return sportIds.length === court.sportIds.length ? court : { ...court, sportIds };
  });

  return { ...state, entries, sports, courts };
}

function toV3(data: z.infer<typeof appStateSchemaV2>): AppState {
  return { ...data, version: 3, playSession: null };
}

function migrateV1(parsed: z.infer<typeof appStateSchemaV1>): AppState {
  const state: AppState = {
    version: 3,
    venue: parsed.venue,
    sports: parsed.sports,
    courts: parsed.courts,
    entries: parsed.entries,
    players: [],
    session: defaultSessionSettings(),
    partnerHistory: [],
    playSession: null,
  };
  return sanitizeAppState(state);
}

function validateRelations(state: AppState): string | null {
  const sportIds = state.sports.map((sport) => sport.id);
  const courtIds = state.courts.map((court) => court.id);
  const entryIds = state.entries.map((entry) => entry.id);
  const playerIds = state.players.map((player) => player.id);

  if (new Set(sportIds).size !== sportIds.length) return "This backup has two sports with the same id.";
  if (new Set(courtIds).size !== courtIds.length) return "This backup has two courts with the same id.";
  if (new Set(entryIds).size !== entryIds.length) return "This backup has two queue entries with the same id.";
  if (new Set(playerIds).size !== playerIds.length) return "This backup has two players with the same id.";

  const sports = new Set(sportIds);
  const courts = new Set(courtIds);

  for (const court of state.courts) {
    if (court.sportIds.some((sportId) => !sports.has(sportId))) {
      return "A court points at a sport that is not in the file.";
    }
  }

  for (const entry of state.entries) {
    if (!sports.has(entry.sportId)) {
      return "A queue entry points at a sport that is not in the file.";
    }
    if (!state.sports.find((sport) => sport.id === entry.sportId)?.formats.includes(entry.format)) {
      return "A queue entry uses a play style that sport does not offer.";
    }
    if (entry.courtId && !courts.has(entry.courtId)) {
      return "A queue entry points at a court that is not in the file.";
    }
    if (entry.courtPreferenceId && !courts.has(entry.courtPreferenceId)) {
      return "A queue entry prefers a court that is not in the file.";
    }
  }

  return null;
}

export function parseAppState(input: unknown): { ok: true; state: AppState } | { ok: false; error: string } {
  const v3 = appStateSchemaV3.safeParse(input);
  if (v3.success) {
    const state = sanitizeAppState(v3.data as AppState);
    const relationError = validateRelations(state);
    if (relationError) return { ok: false, error: relationError };
    return { ok: true, state };
  }

  const v2 = appStateSchemaV2.safeParse(input);
  if (v2.success) {
    const migrated = toV3(v2.data);
    const state = sanitizeAppState(migrated);
    const relationError = validateRelations(state);
    if (relationError) return { ok: false, error: relationError };
    return { ok: true, state };
  }

  const v1 = appStateSchemaV1.safeParse(input);
  if (v1.success) {
    const state = migrateV1(v1.data);
    const relationError = validateRelations(state);
    if (relationError) return { ok: false, error: relationError };
    return { ok: true, state };
  }

  return { ok: false, error: BACKUP_ERROR };
}
