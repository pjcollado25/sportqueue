export const PLAY_FORMATS = ["singles", "doubles", "team"] as const;
export type PlayFormat = (typeof PLAY_FORMATS)[number];

export const ENTRY_STATUSES = [
  "waiting",
  "called",
  "playing",
  "completed",
  "skipped",
  "no_show",
  "left",
  "removed",
] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const COURT_OCCUPANCIES = ["open", "closed", "reserved", "playing"] as const;
export type CourtOccupancy = (typeof COURT_OCCUPANCIES)[number];

export interface Sport {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  formats: PlayFormat[];
  defaultGroupSize: Partial<Record<PlayFormat, number>>;
  defaultMatchMinutes: number;
  builtIn: boolean;
}

export interface Court {
  id: string;
  name: string;
  sportIds: string[];
  closed: boolean;
}

export interface QueueEntry {
  id: string;
  sportId: string;
  format: PlayFormat;
  displayName: string;
  players: string[];
  courtPreferenceId: string | null;
  status: EntryStatus;
  joinedAt: string;
  calledAt?: string;
  startedAt?: string;
  endedAt?: string;
  courtId: string | null;
  ownerToken: string | null;
}

export interface AppState {
  version: 1;
  venue: { name: string };
  sports: Sport[];
  courts: Court[];
  entries: QueueEntry[];
}

export interface SportDraft {
  name: string;
  icon: string;
  formats: PlayFormat[];
  defaultMatchMinutes: number;
  defaultGroupSize: Partial<Record<PlayFormat, number>>;
}

export interface CourtDraft {
  name: string;
  sportIds: string[];
}

export interface JoinRequest {
  sportId: string;
  format: PlayFormat;
  displayName: string;
  teammates: string[];
  courtPreferenceId: string | null;
}

export type DomainResult =
  | { ok: true; state: AppState; entryId?: string }
  | { ok: false; error: string };

export const DATA_KEY = "sportqueue.data.v1";
export const TOKEN_KEY = "sportqueue.player.v1";

export function isActiveStatus(status: EntryStatus): boolean {
  return status === "waiting" || status === "called" || status === "playing";
}
