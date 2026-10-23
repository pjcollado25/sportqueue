import type { AppState, Court, CourtOccupancy, QueueEntry, Sport } from "@/lib/types";
import { isActiveStatus } from "@/lib/types";

export function sportById(state: AppState, sportId: string): Sport | undefined {
  return state.sports.find((sport) => sport.id === sportId);
}

export function courtById(state: AppState, courtId: string | null | undefined): Court | undefined {
  if (!courtId) return undefined;
  return state.courts.find((court) => court.id === courtId);
}

export function courtName(state: AppState, courtId: string | null | undefined): string | null {
  return courtById(state, courtId)?.name ?? null;
}

export function sportName(state: AppState, sportId: string): string {
  return sportById(state, sportId)?.name ?? "Unknown sport";
}

export function courtSupportsSport(court: Court, sportId: string): boolean {
  return court.sportIds.length === 0 || court.sportIds.includes(sportId);
}

export function byJoined(a: QueueEntry, b: QueueEntry): number {
  const byTime = a.joinedAt.localeCompare(b.joinedAt);
  if (byTime !== 0) return byTime;
  return a.id.localeCompare(b.id);
}

export function listWaiting(state: AppState, sportId?: string): QueueEntry[] {
  return state.entries
    .filter((entry) => entry.status === "waiting" && (!sportId || entry.sportId === sportId))
    .sort(byJoined);
}

export function listByStatus(state: AppState, status: QueueEntry["status"], sportId?: string): QueueEntry[] {
  return state.entries
    .filter((entry) => entry.status === status && (!sportId || entry.sportId === sportId))
    .sort(byJoined);
}

export function queuePosition(state: AppState, entryId: string): number | null {
  const entry = state.entries.find((item) => item.id === entryId);
  if (!entry || entry.status !== "waiting") return null;
  const waiting = listWaiting(state, entry.sportId);
  const index = waiting.findIndex((item) => item.id === entryId);
  return index === -1 ? null : index + 1;
}

export function courtOccupancy(
  state: AppState,
  courtId: string,
): { occupancy: CourtOccupancy; entry: QueueEntry | null } {
  const court = courtById(state, courtId);
  if (!court || court.closed) return { occupancy: "closed", entry: null };
  const playing = state.entries.find((entry) => entry.status === "playing" && entry.courtId === courtId);
  if (playing) return { occupancy: "playing", entry: playing };
  const reserved = state.entries.find((entry) => entry.status === "called" && entry.courtId === courtId);
  if (reserved) return { occupancy: "reserved", entry: reserved };
  return { occupancy: "open", entry: null };
}

export function countOpenCourts(state: AppState): number {
  return state.courts.filter((court) => courtOccupancy(state, court.id).occupancy === "open").length;
}

export function countWaiting(state: AppState): number {
  return state.entries.filter((entry) => entry.status === "waiting").length;
}

export function countPlaying(state: AppState): number {
  return state.entries.filter((entry) => entry.status === "playing").length;
}

export function recentFinished(state: AppState, limit: number): QueueEntry[] {
  return state.entries
    .filter((entry) => !isActiveStatus(entry.status))
    .sort((a, b) => (b.endedAt ?? b.joinedAt).localeCompare(a.endedAt ?? a.joinedAt))
    .slice(0, limit);
}

export function myActiveEntries(state: AppState, token: string | null): QueueEntry[] {
  if (!token) return [];
  return state.entries
    .filter((entry) => entry.ownerToken === token && isActiveStatus(entry.status))
    .sort((a, b) => urgency(a) - urgency(b) || a.joinedAt.localeCompare(b.joinedAt));
}

function urgency(entry: QueueEntry): number {
  if (entry.status === "playing") return 0;
  if (entry.status === "called") return 1;
  return 2;
}

export function nextWaiting(state: AppState, sportId: string): QueueEntry | null {
  return listWaiting(state, sportId)[0] ?? null;
}

export function assignableCourts(state: AppState, entry: QueueEntry): Court[] {
  return state.courts.filter((court) => {
    if (!courtSupportsSport(court, entry.sportId)) return false;
    const occupancy = courtOccupancy(state, court.id);
    if (occupancy.occupancy === "open") return true;
    return occupancy.entry?.id === entry.id;
  });
}

export function enabledSports(state: AppState): Sport[] {
  return state.sports.filter((sport) => sport.enabled);
}
