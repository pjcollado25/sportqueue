import { createDemoState } from "@/lib/defaults";
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
  removeCourt,
  removeEntry,
  removeSport,
  returnToQueue,
  setCourtClosed,
  setSportEnabled,
  setVenueName,
  skipEntry,
  staffAddEntry,
  startMatch,
  updateCourt,
  updateSport,
} from "@/lib/domain";
import type { RankedPlayer } from "@/lib/pairing";
import type { SportQueueRepository } from "@/lib/repository";
import { createLocalStorageRepository } from "@/lib/storage";
import type { AppState, CourtDraft, DomainResult, JoinRequest, SportDraft } from "@/lib/types";
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
  returnToQueue: (entryId: string) => string | null;
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
      commit(createDemoState());
    },
  };
}
