import { createInitialState } from "@/lib/defaults";
import {
  addCourt,
  addSkillPairs,
  addSport,
  assignCourt,
  callNext,
  finishMatch,
  joinQueue,
  leaveQueue,
  markNoShow,
  recordMatchResult,
  removeCourt,
  removeEntry,
  removePlayerProfile,
  removeSport,
  returnToQueue,
  setCourtClosed,
  setMinGamesForRanking as setMinGamesForRankingDomain,
  setPlayerSkillLevel,
  setSportEnabled,
  setVenueName,
  skipEntry,
  staffAddEntry,
  startMatch,
  undoMatchResult,
  updateCourt,
  updateSport,
} from "@/lib/domain";
import {
  addPlayersToRoster,
  checkInAllPlayers,
  checkInPlayer,
  checkOutPlayer,
  clearStagedGame,
  endPlaySession,
  generateStagedGame,
  regenerateStagedGame,
  renamePlayer,
  sendStagedGameToQueue,
  startPlaySession,
} from "@/lib/session-domain";
import type { RankedPlayer } from "@/lib/pairing";
import type { SkillLevel } from "@/lib/skill";
import type { MatchWinnerSide } from "@/lib/types";
import type { SportQueueRepository } from "@/lib/repository";
import { createLocalStorageRepository } from "@/lib/storage";
import type { AppState, CourtDraft, DomainResult, JoinRequest, PlayFormat, SportDraft } from "@/lib/types";
import { parseAppState } from "@/lib/validation";

export interface QueueSnapshot {
  ready: boolean;
  state: AppState | null;
  playerToken: string | null;
}

const EMPTY_SNAPSHOT: QueueSnapshot = { ready: false, state: null, playerToken: null };

export type JoinResult = { ok: true; entryId: string } | { ok: false; error: string };

export interface QueueStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => QueueSnapshot;
  getServerSnapshot: () => QueueSnapshot;
  join: (input: JoinRequest) => JoinResult;
  leave: (entryId: string) => string | null;
  staffAdd: (input: JoinRequest) => string | null;
  addSkillPairs: (sportId: string, players: RankedPlayer[]) => string | null;
  remove: (entryId: string) => string | null;
  skip: (entryId: string) => string | null;
  noShow: (entryId: string) => string | null;
  callNext: (sportId: string) => string | null;
  assignCourt: (entryId: string, courtId: string) => string | null;
  startMatch: (entryId: string) => string | null;
  finishMatch: (entryId: string) => string | null;
  recordResult: (
    entryId: string,
    input: { winnerSide: MatchWinnerSide; scoreSideA?: number | null; scoreSideB?: number | null },
  ) => string | null;
  undoResult: (entryId: string) => string | null;
  returnToQueue: (entryId: string) => string | null;
  setPlayerSkill: (playerId: string, skillLevel: SkillLevel | null) => string | null;
  removePlayer: (playerId: string) => string | null;
  setMinGamesForRanking: (minGames: number) => string | null;
  setVenue: (name: string) => string | null;
  addSport: (draft: SportDraft) => string | null;
  updateSport: (sportId: string, draft: SportDraft) => string | null;
  setSportEnabled: (sportId: string, enabled: boolean) => string | null;
  removeSport: (sportId: string) => string | null;
  addCourt: (draft: CourtDraft) => string | null;
  updateCourt: (courtId: string, draft: CourtDraft) => string | null;
  setCourtClosed: (courtId: string, closed: boolean) => string | null;
  removeCourt: (courtId: string) => string | null;
  restore: (input: unknown) => string | null;
  reset: () => void;
  startSession: (input: { courtCount: number; format: PlayFormat; checkInPlayerIds?: string[] }) => string | null;
  endSession: () => string | null;
  checkIn: (playerId: string) => string | null;
  checkInAll: () => { error: string | null; notice: string | null };
  checkOut: (playerId: string) => string | null;
  addPlayers: (names: string[]) => string | null;
  renamePlayer: (playerId: string, name: string) => string | null;
  generateStaged: () => string | null;
  regenerateStaged: () => string | null;
  clearStaged: () => string | null;
  sendStagedToQueue: () => string | null;
}

export function createQueueStore(repository?: SportQueueRepository): QueueStore {
  const listeners = new Set<() => void>();
  let repo = repository ?? null;
  let snapshot: QueueSnapshot = EMPTY_SNAPSHOT;

  function emit() {
    for (const listener of listeners) listener();
  }

  function ensure(): QueueSnapshot {
    if (snapshot.ready) return snapshot;
    if (!repo) {
      if (typeof window === "undefined") return EMPTY_SNAPSHOT;
      repo = createLocalStorageRepository(window.localStorage);
    }
    snapshot = {
      ready: true,
      state: repo.load(),
      playerToken: repo.getPlayerToken(),
    };
    return snapshot;
  }

  function commit(state: AppState) {
    const current = ensure();
    if (!repo || !current.playerToken) return;
    repo.save(state);
    snapshot = { ready: true, state, playerToken: current.playerToken };
    emit();
  }

  function apply(result: DomainResult): string | null {
    if (!result.ok) return result.error;
    commit(result.state);
    return null;
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      if (!repository && typeof window === "undefined") return EMPTY_SNAPSHOT;
      return ensure();
    },
    getServerSnapshot() {
      return EMPTY_SNAPSHOT;
    },
    join(input) {
      const current = ensure();
      if (!current.state || !current.playerToken) {
        return { ok: false, error: "SportQueue is still opening." };
      }
      const result = joinQueue(current.state, { ...input, ownerToken: current.playerToken });
      if (!result.ok) return result;
      commit(result.state);
      return { ok: true, entryId: result.entryId ?? "" };
    },
    leave(entryId) {
      const current = ensure();
      if (!current.state || !current.playerToken) return "SportQueue is still opening.";
      return apply(leaveQueue(current.state, entryId, current.playerToken));
    },
    staffAdd(input) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(staffAddEntry(current.state, input));
    },
    addSkillPairs(sportId, players) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(addSkillPairs(current.state, { sportId, players }));
    },
    remove(entryId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(removeEntry(current.state, entryId));
    },
    skip(entryId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(skipEntry(current.state, entryId));
    },
    noShow(entryId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(markNoShow(current.state, entryId));
    },
    callNext(sportId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(callNext(current.state, sportId));
    },
    assignCourt(entryId, courtId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(assignCourt(current.state, entryId, courtId));
    },
    startMatch(entryId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(startMatch(current.state, entryId));
    },
    finishMatch(entryId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(finishMatch(current.state, entryId));
    },
    recordResult(entryId, input) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(recordMatchResult(current.state, entryId, input));
    },
    undoResult(entryId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(undoMatchResult(current.state, entryId));
    },
    returnToQueue(entryId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(returnToQueue(current.state, entryId));
    },
    setVenue(name) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(setVenueName(current.state, name));
    },
    setPlayerSkill(playerId, skillLevel) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(setPlayerSkillLevel(current.state, playerId, skillLevel));
    },
    removePlayer(playerId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(removePlayerProfile(current.state, playerId));
    },
    setMinGamesForRanking(minGames) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(setMinGamesForRankingDomain(current.state, minGames));
    },
    addSport(draft) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(addSport(current.state, draft));
    },
    updateSport(sportId, draft) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(updateSport(current.state, sportId, draft));
    },
    setSportEnabled(sportId, enabled) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(setSportEnabled(current.state, sportId, enabled));
    },
    removeSport(sportId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(removeSport(current.state, sportId));
    },
    addCourt(draft) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(addCourt(current.state, draft));
    },
    updateCourt(courtId, draft) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(updateCourt(current.state, courtId, draft));
    },
    setCourtClosed(courtId, closed) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(setCourtClosed(current.state, courtId, closed));
    },
    removeCourt(courtId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(removeCourt(current.state, courtId));
    },
    restore(input) {
      const parsed = parseAppState(input);
      if (!parsed.ok) return parsed.error;
      commit(parsed.state);
      return null;
    },
    reset() {
      commit(createInitialState());
    },
    startSession(input) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(startPlaySession(current.state, input));
    },
    endSession() {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(endPlaySession(current.state));
    },
    checkIn(playerId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(checkInPlayer(current.state, playerId));
    },
    checkInAll() {
      const current = ensure();
      if (!current.state) return { error: "SportQueue is still opening.", notice: null };
      const result = checkInAllPlayers(current.state);
      if (!result.ok) return { error: result.error, notice: null };
      const applyError = apply({ ok: true, state: result.state });
      if (applyError) return { error: applyError, notice: null };
      if (result.added === 0 && result.skipped.length === 0) {
        return { error: null, notice: "Everyone on the roster is already checked in." };
      }
      if (result.added === 0) {
        return {
          error: null,
          notice: `No one was checked in. ${result.skipped.length} player(s) are in the queue or on a court.`,
        };
      }
      let notice = `Checked in ${result.added} player${result.added === 1 ? "" : "s"}.`;
      if (result.skipped.length > 0) {
        notice += ` ${result.skipped.length} skipped (in queue or on court).`;
      }
      return { error: null, notice };
    },
    checkOut(playerId) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(checkOutPlayer(current.state, playerId));
    },
    addPlayers(names) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(addPlayersToRoster(current.state, names));
    },
    renamePlayer(playerId, name) {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(renamePlayer(current.state, playerId, name));
    },
    generateStaged() {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(generateStagedGame(current.state));
    },
    regenerateStaged() {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(regenerateStagedGame(current.state));
    },
    clearStaged() {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(clearStagedGame(current.state));
    },
    sendStagedToQueue() {
      const current = ensure();
      if (!current.state) return "SportQueue is still opening.";
      return apply(sendStagedGameToQueue(current.state));
    },
  };
}
