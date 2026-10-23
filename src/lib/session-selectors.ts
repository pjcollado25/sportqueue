import { playerNameKey } from "@/lib/skill";
import { activePlayerNames } from "@/lib/players";
import { assignableCourts, courtOccupancy, listByStatus, listWaiting, sportById } from "@/lib/selectors";
import type { AppState, Court, PlayerProfile, QueueEntry } from "@/lib/types";
import { isActiveStatus } from "@/lib/types";

export function sessionSportId(state: AppState): string | null {
  return state.playSession?.sportId ?? null;
}

export function sessionCourts(state: AppState): Court[] {
  const session = state.playSession;
  if (!session) return [];
  return session.courtIds
    .map((id) => state.courts.find((court) => court.id === id))
    .filter((court): court is Court => Boolean(court));
}

export function sessionEntries(state: AppState, status?: QueueEntry["status"]): QueueEntry[] {
  const sportId = sessionSportId(state);
  if (!sportId) return [];
  if (status) return listByStatus(state, status, sportId);
  return state.entries.filter((entry) => entry.sportId === sportId && isActiveStatus(entry.status));
}

export function sessionWaiting(state: AppState): QueueEntry[] {
  const sportId = sessionSportId(state);
  if (!sportId) return [];
  return listWaiting(state, sportId);
}

export function checkedInPlayers(state: AppState): PlayerProfile[] {
  const session = state.playSession;
  if (!session) return [];
  return session.checkedInPlayerIds
    .map((id) => state.players.find((player) => player.id === id))
    .filter((player): player is PlayerProfile => Boolean(player));
}

export type PlayerAvailability = "checked_out" | "waiting" | "queued" | "called" | "playing";

export function playerAvailability(state: AppState, player: PlayerProfile): PlayerAvailability {
  const session = state.playSession;
  if (!session || !session.checkedInPlayerIds.includes(player.id)) return "checked_out";
  const key = playerNameKey(player.name);
  const entry = state.entries.find(
    (item) =>
      item.sportId === session.sportId &&
      isActiveStatus(item.status) &&
      item.players.some((name) => playerNameKey(name) === key),
  );
  if (!entry) return "waiting";
  if (entry.status === "playing") return "playing";
  if (entry.status === "called") return "called";
  return "queued";
}

export function availableToPlay(state: AppState): PlayerProfile[] {
  const active = activePlayerNames(state);
  return checkedInPlayers(state).filter((player) => !active.has(playerNameKey(player.name)));
}

export function sessionOpenCourts(state: AppState): number {
  return sessionCourts(state).filter((court) => courtOccupancy(state, court.id).occupancy === "open").length;
}

export function sessionLabel(state: AppState): string {
  const session = state.playSession;
  if (!session) return "No session";
  const sport = sportById(state, session.sportId);
  return `${sport?.name ?? "Session"} · ${session.format}`;
}

export function assignableSessionCourts(state: AppState, entry: QueueEntry): Court[] {
  const allowed = new Set(sessionCourts(state).map((court) => court.id));
  return assignableCourts(state, entry).filter((court) => allowed.has(court.id));
}
