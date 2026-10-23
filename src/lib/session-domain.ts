import { createId } from "@/lib/ids";
import { activePlayerNames, upsertPlayerNames } from "@/lib/players";
import { pickSkillPairs, type RankedPlayer } from "@/lib/pairing";
import { partnerHistoryKey, playerNameKey } from "@/lib/skill";
import { sportById } from "@/lib/selectors";
import { DEFAULT_SESSION_SPORT_ID, isSportSelectable } from "@/lib/sports";
import type { AppState, DomainResult, PlayFormat, PlaySession, QueueEntry, StagedGame } from "@/lib/types";
import { isActiveStatus } from "@/lib/types";

export { DEFAULT_SESSION_SPORT_ID };

function ok(state: AppState, entryId?: string): DomainResult {
  return entryId ? { ok: true, state, entryId } : { ok: true, state };
}

function fail(error: string): DomainResult {
  return { ok: false, error };
}

function queueDisplayName(players: string[]): string {
  if (players.length === 4) {
    const match = `${players[0]} & ${players[1]} vs ${players[2]} & ${players[3]}`;
    if (match.length <= 40) return match;
  }
  const pair = `${players[0]} & ${players[1]}`;
  return pair.length <= 40 ? pair : players[0];
}

function syncSessionCourts(state: AppState, sportId: string, courtCount: number): AppState {
  const pickleCourts = state.courts.filter((court) => court.sportIds.includes(sportId));
  const otherCourts = state.courts.filter((court) => !court.sportIds.includes(sportId));
  const courtIds: string[] = [];
  const sessionCourts = [];
  for (let index = 0; index < courtCount; index += 1) {
    const existing = pickleCourts[index];
    const court = existing
      ? { ...existing, name: `Court ${index + 1}`, closed: false }
      : { id: `court-${createId()}`, name: `Court ${index + 1}`, sportIds: [sportId], closed: false };
    courtIds.push(court.id);
    sessionCourts.push(court);
  }
  return { ...state, courts: [...sessionCourts, ...otherCourts] };
}

function closeOtherActiveQueues(state: AppState, sportId: string, now: string): AppState {
  return {
    ...state,
    entries: state.entries.map((entry) => {
      if (!isActiveStatus(entry.status) || entry.sportId === sportId) return entry;
      return { ...entry, status: "removed", endedAt: now };
    }),
  };
}

export function startPlaySession(
  state: AppState,
  input: { courtCount: number; format: PlayFormat; sportId?: string; checkInPlayerIds?: string[] },
  now = new Date().toISOString(),
): DomainResult {
  if (state.playSession) return fail("End the current session before starting a new one.");
  const sportId = input.sportId ?? DEFAULT_SESSION_SPORT_ID;
  const sport = sportById(state, sportId);
  if (!sport || !isSportSelectable(sport)) return fail("Pickleball is not available for a new session.");
  if (!sport.formats.includes(input.format)) return fail("That format is not offered for this sport.");
  if (!Number.isInteger(input.courtCount) || input.courtCount < 1 || input.courtCount > 24) {
    return fail("Choose between 1 and 24 courts.");
  }

  let next = closeOtherActiveQueues(state, sportId, now);
  next = syncSessionCourts(next, sportId, input.courtCount);
  const courtIds = next.courts.filter((court) => court.sportIds.includes(sportId)).slice(0, input.courtCount).map((c) => c.id);

  const checkedInPlayerIds: string[] = [];
  const active = activePlayerNames(next);
  for (const playerId of input.checkInPlayerIds ?? []) {
    const player = next.players.find((item) => item.id === playerId);
    if (!player) continue;
    if (active.has(playerNameKey(player.name))) continue;
    if (!checkedInPlayerIds.includes(playerId)) checkedInPlayerIds.push(playerId);
  }

  const playSession: PlaySession = {
    sportId,
    format: input.format,
    courtIds,
    startedAt: now,
    checkedInPlayerIds,
    staged: null,
  };
  return ok({ ...next, playSession });
}

export function endPlaySession(state: AppState): DomainResult {
  if (!state.playSession) return fail("There is no active session.");
  const busy = state.entries.some(
    (entry) => entry.sportId === state.playSession!.sportId && isActiveStatus(entry.status),
  );
  if (busy) return fail("Finish or clear active games before ending the session.");
  return ok({ ...state, playSession: null });
}

export function checkInPlayer(state: AppState, playerId: string): DomainResult {
  if (!state.playSession) return fail("Start a session before checking players in.");
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return fail("That player is not on the list.");
  if (state.playSession.checkedInPlayerIds.includes(playerId)) {
    return ok(state);
  }
  const active = activePlayerNames(state);
  if (active.has(playerNameKey(player.name))) {
    return fail(`${player.name} is still in a live game or queue spot.`);
  }
  return ok({
    ...state,
    playSession: {
      ...state.playSession,
      checkedInPlayerIds: [...state.playSession.checkedInPlayerIds, playerId],
    },
  });
}

export type CheckInAllResult =
  | { ok: false; error: string }
  | { ok: true; state: AppState; added: number; skipped: string[] };

export function checkInAllPlayers(state: AppState): CheckInAllResult {
  if (!state.playSession) {
    return { ok: false, error: "Start a session before checking players in." };
  }
  let next = state;
  let added = 0;
  const skipped: string[] = [];
  for (const player of state.players) {
    if (next.playSession!.checkedInPlayerIds.includes(player.id)) continue;
    const result = checkInPlayer(next, player.id);
    if (!result.ok) {
      skipped.push(player.name);
      continue;
    }
    const checkedInNow = result.state.playSession!.checkedInPlayerIds.length;
    const checkedInBefore = next.playSession!.checkedInPlayerIds.length;
    if (checkedInNow > checkedInBefore) added += 1;
    next = result.state;
  }
  return { ok: true, state: next, added, skipped };
}

export function checkOutPlayer(state: AppState, playerId: string): DomainResult {
  if (!state.playSession) return fail("Start a session before checking players out.");
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return fail("That player is not on the list.");
  const active = activePlayerNames(state);
  if (active.has(playerNameKey(player.name))) {
    return fail(`${player.name} is in a game or on the queue. Remove them from play first.`);
  }
  return ok({
    ...state,
    playSession: {
      ...state.playSession,
      checkedInPlayerIds: state.playSession.checkedInPlayerIds.filter((id) => id !== playerId),
      staged: clearStagedIfUsesPlayer(state.playSession.staged, player.name),
    },
  });
}

function clearStagedIfUsesPlayer(staged: StagedGame | null, name: string): StagedGame | null {
  if (!staged) return null;
  const names = [staged.sideA[0], staged.sideA[1], staged.sideB[0], staged.sideB[1], staged.sittingOut, staged.waitingPair?.[0], staged.waitingPair?.[1]].filter(
    Boolean,
  ) as string[];
  if (names.some((item) => playerNameKey(item) === playerNameKey(name))) return null;
  return staged;
}

export function addPlayersToRoster(state: AppState, rawNames: string[]): DomainResult {
  const names = rawNames.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return fail("Enter at least one name.");
  const seen = new Set<string>();
  for (const name of names) {
    if (name.length > 40) return fail("Use 40 characters or fewer for each name.");
    const key = playerNameKey(name);
    if (seen.has(key)) return fail(`${name} is listed twice.`);
    seen.add(key);
    if (state.players.some((player) => playerNameKey(player.name) === key)) {
      return fail(`${name} is already on the player list.`);
    }
  }
  return ok(upsertPlayerNames(state, names));
}

export function renamePlayer(state: AppState, playerId: string, name: string): DomainResult {
  const trimmed = name.trim();
  if (trimmed.length < 1) return fail("Enter a name.");
  if (trimmed.length > 40) return fail("Use 40 characters or fewer.");
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return fail("That player is not on the list.");
  const key = playerNameKey(trimmed);
  if (state.players.some((item) => item.id !== playerId && playerNameKey(item.name) === key)) {
    return fail("Another player already uses that name.");
  }
  if (activePlayerNames(state).has(playerNameKey(player.name))) {
    return fail("Finish or remove their current game before renaming.");
  }
  return ok({
    ...state,
    players: state.players.map((item) => (item.id === playerId ? { ...item, name: trimmed } : item)),
  });
}

function availableForPairing(state: AppState): RankedPlayer[] {
  if (!state.playSession) return [];
  const active = activePlayerNames(state);
  return state.playSession.checkedInPlayerIds
    .map((id) => state.players.find((player) => player.id === id))
    .filter((player): player is NonNullable<typeof player> => Boolean(player))
    .filter((player) => !active.has(playerNameKey(player.name)))
    .map((player) => ({
      name: player.name,
      skillLevel: player.skillLevel,
      checkInOrder: player.checkInOrder,
      sitOutCount: player.sitOutCount,
    }));
}

function buildStagedFromPairing(state: AppState, revision: number): DomainResult {
  if (!state.playSession) return fail("Start a session first.");
  if (state.playSession.format !== "doubles") {
    return fail("Balanced team building is available for doubles in this session.");
  }
  const pool = availableForPairing(state);
  if (pool.length < 4) {
    return fail("Check in at least four available players to build a doubles game.");
  }
  const picked = pickSkillPairs(pool, { partnerHistory: new Set(state.partnerHistory) });
  if (!picked.ok) return fail(picked.error);
  const game = picked.pairing.games[0];
  if (!game) {
    return fail("Not enough players for a full game. Wait for more check-ins or clear the queue.");
  }
  const staged: StagedGame = {
    sideA: game.sideA.players,
    sideB: game.sideB.players,
    sittingOut: picked.pairing.sittingOut,
    waitingPair: picked.pairing.waitingPair?.players ?? null,
    revision,
  };
  return ok({
    ...state,
    playSession: { ...state.playSession, staged },
  });
}

export function generateStagedGame(state: AppState): DomainResult {
  const revision = (state.playSession?.staged?.revision ?? 0) + 1;
  return buildStagedFromPairing(state, revision);
}

export function regenerateStagedGame(state: AppState): DomainResult {
  if (!state.playSession) return fail("Start a session first.");
  const revision = (state.playSession.staged?.revision ?? 0) + 1;
  return buildStagedFromPairing(state, revision);
}

export function clearStagedGame(state: AppState): DomainResult {
  if (!state.playSession) return fail("Start a session first.");
  return ok({ ...state, playSession: { ...state.playSession, staged: null } });
}

export function sendStagedGameToQueue(state: AppState, now = new Date().toISOString()): DomainResult {
  if (!state.playSession?.staged) return fail("Build a game and review the teams first.");
  const session = state.playSession;
  const staged = session.staged!;
  const players = [...staged.sideA, ...staged.sideB];
  const busy = players.some((name) => activePlayerNames(state).has(playerNameKey(name)));
  if (busy) return fail("Someone on this game is already in the queue or on a court.");

  const entryId = createId();
  const entry: QueueEntry = {
    id: entryId,
    sportId: session.sportId,
    format: session.format,
    displayName: queueDisplayName(players),
    players,
    courtPreferenceId: null,
    status: "waiting",
    joinedAt: now,
    courtId: null,
    ownerToken: null,
  };

  const partnerKeys = [
    partnerHistoryKey(staged.sideA[0], staged.sideA[1]),
    partnerHistoryKey(staged.sideB[0], staged.sideB[1]),
  ];
  const history = new Set(state.partnerHistory);
  for (const key of partnerKeys) history.add(key);

  let next: AppState = {
    ...state,
    partnerHistory: [...history],
    entries: [...state.entries, entry],
    playSession: { ...session, staged: null },
  };

  if (staged.sittingOut) {
    const key = playerNameKey(staged.sittingOut);
    next = {
      ...next,
      players: next.players.map((player) =>
        playerNameKey(player.name) === key ? { ...player, sitOutCount: player.sitOutCount + 1 } : player,
      ),
    };
  }

  if (staged.waitingPair) {
    const pairEntry: QueueEntry = {
      id: createId(),
      sportId: session.sportId,
      format: session.format,
      displayName: queueDisplayName([...staged.waitingPair]),
      players: [...staged.waitingPair],
      courtPreferenceId: null,
      status: "waiting",
      joinedAt: new Date(Date.parse(now) + 1).toISOString(),
      courtId: null,
      ownerToken: null,
    };
    next = {
      ...next,
      entries: [...next.entries, pairEntry],
      partnerHistory: [...next.partnerHistory, partnerHistoryKey(staged.waitingPair[0], staged.waitingPair[1])],
    };
  }

  return ok(next, entryId);
}

export function defaultPlaySession(state: AppState): PlaySession | null {
  return state.playSession;
}
