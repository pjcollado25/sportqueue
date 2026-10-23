import { createId } from "@/lib/ids";
import { activePlayerNames, upsertPlayerNames } from "@/lib/players";
import { pickSkillPairs, type RankedPlayer } from "@/lib/pairing";
import { partnerHistoryKey, playerNameKey, type SkillLevel } from "@/lib/skill";
import { courtOccupancy, courtSupportsSport, listWaiting, sportById } from "@/lib/selectors";
import { isSportSelectable } from "@/lib/sports";
import type {
  AppState,
  CourtDraft,
  DomainResult,
  JoinRequest,
  MatchResultUndo,
  MatchWinnerSide,
  PlayerProfile,
  QueueEntry,
  Sport,
  SportDraft,
} from "@/lib/types";
import { isActiveStatus, PLAY_FORMATS } from "@/lib/types";

function ok(state: AppState, entryId?: string): DomainResult {
  return entryId ? { ok: true, state, entryId } : { ok: true, state };
}

function fail(error: string): DomainResult {
  return { ok: false, error };
}

function mapEntry(state: AppState, entryId: string, update: (entry: QueueEntry) => QueueEntry): AppState {
  return {
    ...state,
    entries: state.entries.map((entry) => (entry.id === entryId ? update(entry) : entry)),
  };
}

function findEntry(state: AppState, entryId: string): QueueEntry | undefined {
  return state.entries.find((entry) => entry.id === entryId);
}

function cleanFormats(formats: SportDraft["formats"]): Sport["formats"] {
  return PLAY_FORMATS.filter((format) => formats.includes(format));
}

function validateDraft(draft: SportDraft): string | null {
  const name = draft.name.trim();
  const icon = draft.icon.trim();
  const formats = cleanFormats(draft.formats);
  if (name.length < 1) return "Enter a sport name.";
  if (name.length > 40) return "Use 40 characters or fewer for the sport name.";
  if (icon.length < 1 || icon.length > 8) return "Add a short symbol, such as a sports emoji.";
  if (formats.length < 1) return "Choose at least one way to play.";
  if (!Number.isInteger(draft.defaultMatchMinutes) || draft.defaultMatchMinutes < 5 || draft.defaultMatchMinutes > 240) {
    return "Enter a match length between 5 and 240 minutes.";
  }
  for (const format of formats) {
    const size = draft.defaultGroupSize[format];
    if (size === undefined) continue;
    if (!Number.isInteger(size) || size < 1 || size > 20) {
      return "Usual group size must be between 1 and 20.";
    }
  }
  return null;
}

function normalizeNames(request: JoinRequest): { name: string; teammates: string[] } | { error: string } {
  const name = request.displayName.trim();
  const teammates = request.teammates.map((teammate) => teammate.trim()).filter(Boolean);
  if (name.length < 1) return { error: "Enter a name so staff know who to call." };
  if (name.length > 40) return { error: "Use 40 characters or fewer." };
  if (teammates.some((teammate) => teammate.length > 40)) {
    return { error: "Use 40 characters or fewer for each name." };
  }
  if (request.format === "singles" && teammates.length > 0) {
    return { error: "Singles is one player. Remove the extra names or choose doubles." };
  }
  if (request.format === "doubles" && teammates.length > 1) {
    return { error: "Doubles is two players. Keep one partner name." };
  }
  if (teammates.length > 10) return { error: "Add up to 10 player names." };
  return { name, teammates };
}

function preferenceError(state: AppState, sportId: string, courtPreferenceId: string | null): string | null {
  if (!courtPreferenceId) return null;
  const court = state.courts.find((item) => item.id === courtPreferenceId);
  if (!court) return "Choose a court from the list.";
  if (!courtSupportsSport(court, sportId)) return "That court is not used for this sport.";
  if (court.closed) return "That court is closed. Choose another court or any court.";
  return null;
}

function assertPlayersAvailable(state: AppState, names: string[]): string | null {
  const active = activePlayerNames(state);
  for (const name of names) {
    const key = playerNameKey(name);
    if (active.has(key)) return `${name.trim()} is already waiting, called, or playing.`;
  }
  return null;
}

function sportForNewPlay(state: AppState, sportId: string): Sport | null {
  const sport = sportById(state, sportId);
  if (!sport || !isSportSelectable(sport)) return null;
  return sport;
}

export function joinQueue(state: AppState, input: JoinRequest & { ownerToken: string }, now = new Date().toISOString()): DomainResult {
  const sport = sportForNewPlay(state, input.sportId);
  if (!sport) return fail("Pick a sport that is turned on.");
  if (!sport.formats.includes(input.format)) return fail("That sport does not offer this way of playing.");
  const names = normalizeNames(input);
  if ("error" in names) return fail(names.error);
  const preference = preferenceError(state, sport.id, input.courtPreferenceId);
  if (preference) return fail(preference);
  const already = state.entries.some(
    (entry) =>
      entry.ownerToken !== null &&
      entry.ownerToken === input.ownerToken &&
      entry.sportId === sport.id &&
      isActiveStatus(entry.status),
  );
  if (already) return fail("You are already in this sport's queue. Check Live queue for your place.");

  const players = input.format === "team" ? (names.teammates.length > 0 ? names.teammates : [names.name]) : [names.name, ...names.teammates];
  const busy = assertPlayersAvailable(state, players);
  if (busy) return fail(busy);
  const entryId = createId();
  const entry: QueueEntry = {
    id: entryId,
    sportId: sport.id,
    format: input.format,
    displayName: names.name,
    players,
    courtPreferenceId: input.courtPreferenceId,
    status: "waiting",
    joinedAt: now,
    courtId: null,
    ownerToken: input.ownerToken,
  };
  const withPlayers = upsertPlayerNames(state, players);
  return ok({ ...withPlayers, entries: [...withPlayers.entries, entry] }, entryId);
}

export function staffAddEntry(state: AppState, input: JoinRequest, now = new Date().toISOString()): DomainResult {
  return addAsStaff(state, input, now);
}

function queueDisplayName(players: string[]): string {
  if (players.length === 4) {
    const match = `${players[0]} & ${players[1]} vs ${players[2]} & ${players[3]}`;
    if (match.length <= 40) return match;
  }
  const pair = `${players[0]} & ${players[1]}`;
  return pair.length <= 40 ? pair : players[0];
}

export function addSkillPairs(
  state: AppState,
  input: { sportId: string; players: RankedPlayer[] },
  now = new Date().toISOString(),
): DomainResult {
  const sport = sportForNewPlay(state, input.sportId);
  if (!sport) return fail("Pick a sport that is turned on.");
  if (!sport.formats.includes("doubles")) return fail("That sport does not offer doubles, so pairs cannot be added.");
  const picked = pickSkillPairs(input.players, { partnerHistory: new Set(state.partnerHistory) });
  if (!picked.ok) return fail(picked.error);

  const groups: string[][] = [
    ...picked.pairing.games.map((game) => [
      game.sideA.players[0],
      game.sideA.players[1],
      game.sideB.players[0],
      game.sideB.players[1],
    ]),
    ...(picked.pairing.waitingPair ? [[picked.pairing.waitingPair.players[0], picked.pairing.waitingPair.players[1]]] : []),
  ];
  if (groups.length === 0) return fail("Add at least two names so a pair can be made.");

  const allNames = groups.flat();
  const busy = assertPlayersAvailable(state, allNames);
  if (busy) return fail(busy);

  const start = Date.parse(now);
  const base = Number.isFinite(start) ? start : Date.now();
  const entries: QueueEntry[] = groups.map((players, index) => ({
    id: createId(),
    sportId: sport.id,
    format: "doubles",
    displayName: queueDisplayName(players),
    players,
    courtPreferenceId: null,
    status: "waiting",
    joinedAt: new Date(base + index).toISOString(),
    courtId: null,
    ownerToken: null,
  }));

  let next = upsertPlayerNames(state, allNames);
  const partnerKeys: string[] = [];
  for (const game of picked.pairing.games) {
    partnerKeys.push(partnerHistoryKey(game.sideA.players[0], game.sideA.players[1]));
    partnerKeys.push(partnerHistoryKey(game.sideB.players[0], game.sideB.players[1]));
  }
  if (picked.pairing.waitingPair) {
    partnerKeys.push(partnerHistoryKey(picked.pairing.waitingPair.players[0], picked.pairing.waitingPair.players[1]));
  }
  const history = new Set(next.partnerHistory);
  for (const key of partnerKeys) history.add(key);

  if (picked.pairing.sittingOut) {
    const key = playerNameKey(picked.pairing.sittingOut);
    next = {
      ...next,
      players: next.players.map((player) =>
        playerNameKey(player.name) === key ? { ...player, sitOutCount: player.sitOutCount + 1 } : player,
      ),
    };
  }

  return ok({
    ...next,
    partnerHistory: [...history],
    entries: [...next.entries, ...entries],
  });
}

function addAsStaff(state: AppState, input: JoinRequest, now: string): DomainResult {
  const names = normalizeNames(input);
  if ("error" in names) return fail(names.error);
  const sport = sportForNewPlay(state, input.sportId);
  if (!sport) return fail("Pick a sport that is turned on.");
  if (!sport.formats.includes(input.format)) return fail("That sport does not offer this way of playing.");
  const preference = preferenceError(state, sport.id, input.courtPreferenceId);
  if (preference) return fail(preference);
  const players = input.format === "team" ? (names.teammates.length > 0 ? names.teammates : [names.name]) : [names.name, ...names.teammates];
  const busy = assertPlayersAvailable(state, players);
  if (busy) return fail(busy);
  const entryId = createId();
  const entry: QueueEntry = {
    id: entryId,
    sportId: sport.id,
    format: input.format,
    displayName: names.name,
    players,
    courtPreferenceId: input.courtPreferenceId,
    status: "waiting",
    joinedAt: now,
    courtId: null,
    ownerToken: null,
  };
  const withPlayers = upsertPlayerNames(state, players);
  return ok({ ...withPlayers, entries: [...withPlayers.entries, entry] }, entryId);
}

export function leaveQueue(state: AppState, entryId: string, token: string, now = new Date().toISOString()): DomainResult {
  const entry = findEntry(state, entryId);
  if (!entry) return fail("That spot is no longer in the queue.");
  if (entry.status === "playing") return fail("This game has started. Ask staff to finish it.");
  if (entry.status !== "waiting" && entry.status !== "called") {
    return fail("You can only leave while you are waiting or called.");
  }
  if (entry.ownerToken === null || entry.ownerToken !== token) {
    return fail("You can only leave a spot you joined on this phone.");
  }
  return ok(mapEntry(state, entryId, (item) => ({ ...item, status: "left", endedAt: now, courtId: null })));
}

export function removeEntry(state: AppState, entryId: string, now = new Date().toISOString()): DomainResult {
  const entry = findEntry(state, entryId);
  if (!entry) return fail("That queue entry is no longer here.");
  if (!isActiveStatus(entry.status)) return fail("That entry is already in the history.");
  return ok(mapEntry(state, entryId, (item) => ({ ...item, status: "removed", endedAt: now, courtId: null })));
}

export function skipEntry(state: AppState, entryId: string, now = new Date().toISOString()): DomainResult {
  const entry = findEntry(state, entryId);
  if (!entry) return fail("That queue entry is no longer here.");
  if (entry.status !== "waiting" && entry.status !== "called") {
    return fail("Only a waiting or called group can be skipped.");
  }
  return ok(mapEntry(state, entryId, (item) => ({ ...item, status: "skipped", endedAt: now, courtId: null })));
}

export function markNoShow(state: AppState, entryId: string, now = new Date().toISOString()): DomainResult {
  const entry = findEntry(state, entryId);
  if (!entry) return fail("That queue entry is no longer here.");
  if (entry.status !== "waiting" && entry.status !== "called") {
    return fail("Only a waiting or called group can be marked as a no-show.");
  }
  return ok(mapEntry(state, entryId, (item) => ({ ...item, status: "no_show", endedAt: now, courtId: null })));
}

export function callNext(state: AppState, sportId: string, now = new Date().toISOString()): DomainResult {
  const sport = sportById(state, sportId);
  if (!sport) return fail("Choose a sport.");
  const next = listWaiting(state, sportId)[0];
  if (!next) return fail(`Nobody is waiting for ${sport.name}.`);
  return ok(mapEntry(state, next.id, (item) => ({ ...item, status: "called", calledAt: now })));
}

export function assignCourt(state: AppState, entryId: string, courtId: string): DomainResult {
  const entry = findEntry(state, entryId);
  if (!entry) return fail("That queue entry is no longer here.");
  if (entry.status !== "called") return fail("Call this group first, then assign a court.");
  const court = state.courts.find((item) => item.id === courtId);
  if (!court) return fail("Choose a court from the list.");
  if (court.closed) return fail("That court is closed.");
  if (!courtSupportsSport(court, entry.sportId)) return fail("That court is not set up for this sport.");
  const occupancy = courtOccupancy(state, court.id);
  if (occupancy.entry && occupancy.entry.id !== entry.id) return fail("That court is already taken.");
  return ok(mapEntry(state, entryId, (item) => ({ ...item, courtId: court.id })));
}

export function startMatch(state: AppState, entryId: string, now = new Date().toISOString()): DomainResult {
  const entry = findEntry(state, entryId);
  if (!entry) return fail("That queue entry is no longer here.");
  if (entry.status !== "called") return fail("Call the group before starting the game.");
  if (!entry.courtId) return fail("Choose a court before starting the game.");
  const occupancy = courtOccupancy(state, entry.courtId);
  if (occupancy.occupancy === "closed") return fail("That court is closed.");
  if (occupancy.entry && occupancy.entry.id !== entry.id) return fail("That court is already in use.");
  return ok(mapEntry(state, entryId, (item) => ({ ...item, status: "playing", startedAt: now })));
}

export function finishMatch(state: AppState, entryId: string, now = new Date().toISOString()): DomainResult {
  const entry = findEntry(state, entryId);
  if (!entry) return fail("That queue entry is no longer here.");
  if (entry.status !== "playing") return fail("Only a game that has started can be finished.");
  return ok(mapEntry(state, entryId, (item) => ({ ...item, status: "completed", endedAt: now })));
}

function winnersAndLosers(entry: QueueEntry, winnerSide: MatchWinnerSide): { winners: string[]; losers: string[] } {
  if (entry.format === "doubles" && entry.players.length >= 4) {
    const sideA = entry.players.slice(0, 2);
    const sideB = entry.players.slice(2, 4);
    return winnerSide === "A" ? { winners: sideA, losers: sideB } : { winners: sideB, losers: sideA };
  }
  const player = entry.players[0] ?? entry.displayName;
  return winnerSide === "A" ? { winners: [player], losers: [] } : { winners: [], losers: [player] };
}

function applyPlayerDelta(players: PlayerProfile[], playerId: string, delta: MatchResultUndo["playerDeltas"][number]): PlayerProfile[] {
  return players.map((player) => {
    if (player.id !== playerId) return player;
    return {
      ...player,
      wins: player.wins + delta.wins,
      losses: player.losses + delta.losses,
      games: player.games + delta.games,
      pointsFor: player.pointsFor + delta.pointsFor,
      pointsAgainst: player.pointsAgainst + delta.pointsAgainst,
    };
  });
}

export function recordMatchResult(
  state: AppState,
  entryId: string,
  input: { winnerSide: MatchWinnerSide; scoreSideA?: number | null; scoreSideB?: number | null },
  now = new Date().toISOString(),
): DomainResult {
  const entry = findEntry(state, entryId);
  if (!entry) return fail("That queue entry is no longer here.");
  if (entry.status !== "playing") return fail("Start the game on a court before recording a result.");

  const scoreSideA = input.scoreSideA ?? null;
  const scoreSideB = input.scoreSideB ?? null;
  if (scoreSideA !== null && (!Number.isInteger(scoreSideA) || scoreSideA < 0 || scoreSideA > 99)) {
    return fail("Enter a score between 0 and 99.");
  }
  if (scoreSideB !== null && (!Number.isInteger(scoreSideB) || scoreSideB < 0 || scoreSideB > 99)) {
    return fail("Enter a score between 0 and 99.");
  }

  const { winners, losers } = winnersAndLosers(entry, input.winnerSide);
  const allNames = [...winners, ...losers];
  let next = upsertPlayerNames(state, allNames.length > 0 ? allNames : entry.players);

  const playerDeltas: MatchResultUndo["playerDeltas"] = [];
  const pointsA = scoreSideA ?? 0;
  const pointsB = scoreSideB ?? 0;
  const winnersPoints = input.winnerSide === "A" ? pointsA : pointsB;
  const losersPoints = input.winnerSide === "A" ? pointsB : pointsA;
  const trackPoints = scoreSideA !== null && scoreSideB !== null;

  for (const name of winners) {
    const profile = next.players.find((player) => playerNameKey(player.name) === playerNameKey(name));
    if (!profile) continue;
    const delta = {
      playerId: profile.id,
      wins: 1,
      losses: 0,
      games: 1,
      pointsFor: trackPoints ? winnersPoints : 0,
      pointsAgainst: trackPoints ? losersPoints : 0,
    };
    playerDeltas.push(delta);
    next = { ...next, players: applyPlayerDelta(next.players, profile.id, delta) };
  }
  for (const name of losers) {
    const profile = next.players.find((player) => playerNameKey(player.name) === playerNameKey(name));
    if (!profile) continue;
    const delta = {
      playerId: profile.id,
      wins: 0,
      losses: 1,
      games: 1,
      pointsFor: trackPoints ? losersPoints : 0,
      pointsAgainst: trackPoints ? winnersPoints : 0,
    };
    playerDeltas.push(delta);
    next = { ...next, players: applyPlayerDelta(next.players, profile.id, delta) };
  }

  const undo: MatchResultUndo = {
    winnerSide: input.winnerSide,
    scoreSideA,
    scoreSideB,
    playerDeltas,
    partnerKeysAdded: [],
    sitOutDeltas: [],
  };

  const completed = mapEntry(next, entryId, (item) => ({
    ...item,
    status: "completed",
    endedAt: now,
    winnerSide: input.winnerSide,
    scoreSideA,
    scoreSideB,
    resultUndo: undo,
  }));

  return ok(completed);
}

export function undoMatchResult(state: AppState, entryId: string): DomainResult {
  const entry = findEntry(state, entryId);
  if (!entry) return fail("That queue entry is no longer here.");
  if (entry.status !== "completed" || !entry.resultUndo) return fail("There is no result to undo for this game.");

  let players = state.players;
  for (const delta of entry.resultUndo.playerDeltas) {
    players = applyPlayerDelta(players, delta.playerId, {
      playerId: delta.playerId,
      wins: -delta.wins,
      losses: -delta.losses,
      games: -delta.games,
      pointsFor: -delta.pointsFor,
      pointsAgainst: -delta.pointsAgainst,
    });
  }

  const restored = mapEntry({ ...state, players }, entryId, (item) => ({
    ...item,
    status: "playing",
    endedAt: undefined,
    winnerSide: null,
    scoreSideA: null,
    scoreSideB: null,
    resultUndo: null,
  }));

  return ok(restored);
}

export function setPlayerSkillLevel(state: AppState, playerId: string, skillLevel: SkillLevel | null): DomainResult {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return fail("That player is no longer on the list.");
  return ok({
    ...state,
    players: state.players.map((item) => (item.id === playerId ? { ...item, skillLevel } : item)),
  });
}

export function removePlayerProfile(state: AppState, playerId: string): DomainResult {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return fail("That player is no longer on the list.");
  const active = activePlayerNames(state);
  if (active.has(playerNameKey(player.name))) {
    return fail("This player is still in the live queue or on a court.");
  }
  return ok({ ...state, players: state.players.filter((item) => item.id !== playerId) });
}

export function setMinGamesForRanking(state: AppState, minGames: number): DomainResult {
  if (!Number.isInteger(minGames) || minGames < 1 || minGames > 20) {
    return fail("Minimum games for ranking must be between 1 and 20.");
  }
  return ok({ ...state, session: { ...state.session, minGamesForRanking: minGames } });
}

export function returnToQueue(state: AppState, entryId: string): DomainResult {
  const entry = findEntry(state, entryId);
  if (!entry) return fail("That queue entry is no longer here.");
  if (entry.status !== "called" && entry.status !== "playing") {
    return fail("Only a called or playing group can go back to the queue.");
  }
  return ok(
    mapEntry(state, entryId, (item) => ({
      ...item,
      status: "waiting",
      courtId: null,
      calledAt: undefined,
      startedAt: undefined,
    })),
  );
}

export function setVenueName(state: AppState, name: string): DomainResult {
  const trimmed = name.trim();
  if (trimmed.length < 1) return fail("Enter the venue name.");
  if (trimmed.length > 60) return fail("Use 60 characters or fewer for the venue name.");
  return ok({ ...state, venue: { name: trimmed } });
}

export function addSport(state: AppState, draft: SportDraft): DomainResult {
  const error = validateDraft(draft);
  if (error) return fail(error);
  const sportItem: Sport = {
    id: `sport-${createId()}`,
    name: draft.name.trim(),
    icon: draft.icon.trim(),
    enabled: true,
    formats: cleanFormats(draft.formats),
    defaultGroupSize: draft.defaultGroupSize,
    defaultMatchMinutes: draft.defaultMatchMinutes,
    builtIn: false,
  };
  return ok({ ...state, sports: [...state.sports, sportItem] });
}

export function updateSport(state: AppState, sportId: string, draft: SportDraft): DomainResult {
  const current = sportById(state, sportId);
  if (!current) return fail("That sport is no longer here.");
  const error = validateDraft(draft);
  if (error) return fail(error);
  const formats = cleanFormats(draft.formats);
  const activeFormats = new Set(
    state.entries.filter((entry) => entry.sportId === sportId && isActiveStatus(entry.status)).map((entry) => entry.format),
  );
  for (const format of activeFormats) {
    if (!formats.includes(format)) {
      return fail("People are still queued for a play style you are trying to turn off.");
    }
  }
  return ok({
    ...state,
    sports: state.sports.map((sport) =>
      sport.id === sportId
        ? {
            ...sport,
            name: draft.name.trim(),
            icon: draft.icon.trim(),
            formats,
            defaultGroupSize: draft.defaultGroupSize,
            defaultMatchMinutes: draft.defaultMatchMinutes,
          }
        : sport,
    ),
  });
}

export function setSportEnabled(state: AppState, sportId: string, enabled: boolean): DomainResult {
  if (!sportById(state, sportId)) return fail("That sport is no longer here.");
  return ok({
    ...state,
    sports: state.sports.map((sport) => (sport.id === sportId ? { ...sport, enabled } : sport)),
  });
}

export function removeSport(state: AppState, sportId: string): DomainResult {
  const sport = sportById(state, sportId);
  if (!sport) return fail("That sport is no longer here.");
  if (state.entries.some((entry) => entry.sportId === sportId && isActiveStatus(entry.status))) {
    return fail("People are still waiting or playing this sport. Finish or remove them first.");
  }
  if (state.sports.length <= 1) return fail("Keep at least one sport.");
  const remainingIds = state.sports.filter((item) => item.id !== sportId).map((item) => item.id);
  return ok({
    ...state,
    sports: state.sports.filter((item) => item.id !== sportId),
    courts: state.courts.map((court) => {
      if (!court.sportIds.includes(sportId)) return court;
      const sportIds = court.sportIds.filter((id) => id !== sportId);
      return { ...court, sportIds: sportIds.length > 0 ? sportIds : remainingIds };
    }),
  });
}

function validateCourt(state: AppState, draft: CourtDraft): string | null {
  const name = draft.name.trim();
  if (name.length < 1) return "Enter a court name.";
  if (name.length > 40) return "Use 40 characters or fewer for the court name.";
  if (draft.sportIds.some((sportId) => !sportById(state, sportId))) return "Choose sports from the list.";
  return null;
}

export function addCourt(state: AppState, draft: CourtDraft): DomainResult {
  const error = validateCourt(state, draft);
  if (error) return fail(error);
  return ok({
    ...state,
    courts: [
      ...state.courts,
      { id: `court-${createId()}`, name: draft.name.trim(), sportIds: [...draft.sportIds], closed: false },
    ],
  });
}

export function updateCourt(state: AppState, courtId: string, draft: CourtDraft): DomainResult {
  const court = state.courts.find((item) => item.id === courtId);
  if (!court) return fail("That court is no longer here.");
  const error = validateCourt(state, draft);
  if (error) return fail(error);
  const busy = state.entries.find(
    (entry) => (entry.status === "playing" || entry.status === "called") && entry.courtId === courtId,
  );
  if (busy && draft.sportIds.length > 0 && !draft.sportIds.includes(busy.sportId)) {
    return fail("This court is in use for a sport you are trying to remove.");
  }
  return ok({
    ...state,
    courts: state.courts.map((item) =>
      item.id === courtId ? { ...item, name: draft.name.trim(), sportIds: [...draft.sportIds] } : item,
    ),
  });
}

export function setCourtClosed(state: AppState, courtId: string, closed: boolean): DomainResult {
  const court = state.courts.find((item) => item.id === courtId);
  if (!court) return fail("That court is no longer here.");
  if (closed) {
    const occupancy = courtOccupancy(state, courtId);
    if (occupancy.occupancy === "playing" || occupancy.occupancy === "reserved") {
      return fail("This court is in use. Finish the game before closing it.");
    }
  }
  return ok({
    ...state,
    courts: state.courts.map((item) => (item.id === courtId ? { ...item, closed } : item)),
  });
}

export function removeCourt(state: AppState, courtId: string): DomainResult {
  const court = state.courts.find((item) => item.id === courtId);
  if (!court) return fail("That court is no longer here.");
  const occupancy = courtOccupancy(state, courtId);
  if (occupancy.occupancy === "playing" || occupancy.occupancy === "reserved") {
    return fail("This court is in use. Finish the game before removing it.");
  }
  return ok({
    ...state,
    courts: state.courts.filter((item) => item.id !== courtId),
    entries: state.entries.map((entry) =>
      entry.courtPreferenceId === courtId ? { ...entry, courtPreferenceId: null } : entry,
    ),
  });
}
