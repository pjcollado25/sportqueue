import { z } from "zod";
import type { AppState } from "@/lib/types";
import { ENTRY_STATUSES, PLAY_FORMATS } from "@/lib/types";

const playFormatSchema = z.enum(PLAY_FORMATS);
const entryStatusSchema = z.enum(ENTRY_STATUSES);

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
});

export const appStateSchema = z.object({
  version: z.literal(1),
  venue: z.object({
    name: z.string().trim().min(1).max(60),
  }),
  sports: z.array(sportSchema).min(1).max(40),
  courts: z.array(courtSchema).max(80),
  entries: z.array(entrySchema).max(500),
});

const BACKUP_ERROR = "This file is not a SportQueue backup. Use a file exported from SportQueue.";

export function parseAppState(input: unknown): { ok: true; state: AppState } | { ok: false; error: string } {
  const parsed = appStateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: BACKUP_ERROR };

  const state = parsed.data as AppState;
  const sportIds = state.sports.map((sport) => sport.id);
  const courtIds = state.courts.map((court) => court.id);
  const entryIds = state.entries.map((entry) => entry.id);

  if (new Set(sportIds).size !== sportIds.length) {
    return { ok: false, error: "This backup has two sports with the same id." };
  }
  if (new Set(courtIds).size !== courtIds.length) {
    return { ok: false, error: "This backup has two courts with the same id." };
  }
  if (new Set(entryIds).size !== entryIds.length) {
    return { ok: false, error: "This backup has two queue entries with the same id." };
  }

  const sports = new Set(sportIds);
  const courts = new Set(courtIds);

  for (const court of state.courts) {
    if (court.sportIds.some((sportId) => !sports.has(sportId))) {
      return { ok: false, error: "A court points at a sport that is not in the file." };
    }
  }

  for (const entry of state.entries) {
    if (!sports.has(entry.sportId)) {
      return { ok: false, error: "A queue entry points at a sport that is not in the file." };
    }
    if (!state.sports.find((sport) => sport.id === entry.sportId)?.formats.includes(entry.format)) {
      return { ok: false, error: "A queue entry uses a play style that sport does not offer." };
    }
    if (entry.courtId && !courts.has(entry.courtId)) {
      return { ok: false, error: "A queue entry points at a court that is not in the file." };
    }
    if (entry.courtPreferenceId && !courts.has(entry.courtPreferenceId)) {
      return { ok: false, error: "A queue entry prefers a court that is not in the file." };
    }
  }

  return { ok: true, state };
}
