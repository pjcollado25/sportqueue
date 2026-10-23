import { createDemoState } from "@/lib/defaults";
import { createMultiSportQueueState } from "@/test/queue-fixture";
import {
  addSkillPairs,
  assignCourt,
  callNext,
  joinQueue,
  leaveQueue,
  recordMatchResult,
  removeSport,
  setCourtClosed,
  setSportEnabled,
  staffAddEntry,
  startMatch,
  undoMatchResult,
} from "@/lib/domain";
import { entryTitle } from "@/lib/labels";
import { countOpenCourts, queuePosition } from "@/lib/selectors";
import { parseAppState } from "@/lib/validation";
import { describe, expect, it } from "vitest";

const joinBase = {
  teammates: [] as string[],
  courtPreferenceId: null,
};

describe("queue rules", () => {
  it("puts a new player behind people already waiting", () => {
    const joined = joinQueue(createMultiSportQueueState(), {
      ...joinBase,
      sportId: "pickleball",
      format: "singles",
      displayName: "Nia",
      ownerToken: "nia",
    });
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    const entry = joined.state.entries.find((item) => item.displayName === "Nia");
    expect(entry).toBeTruthy();
    expect(queuePosition(joined.state, entry!.id)).toBe(3);
  });

  it("gives the first tennis player the next place", () => {
    const joined = joinQueue(createMultiSportQueueState(), {
      ...joinBase,
      sportId: "tennis",
      format: "singles",
      displayName: "Nia",
      ownerToken: "nia",
    });
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    const entry = joined.state.entries.find((item) => item.displayName === "Nia")!;
    expect(queuePosition(joined.state, entry.id)).toBe(1);
  });

  it("blocks a second active spot in the same sport on one phone", () => {
    const first = joinQueue(createMultiSportQueueState(), {
      ...joinBase,
      sportId: "volleyball",
      format: "team",
      displayName: "Aces",
      ownerToken: "phone-1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = joinQueue(first.state, {
      ...joinBase,
      sportId: "volleyball",
      format: "team",
      displayName: "Aces again",
      ownerToken: "phone-1",
    });
    expect(second.ok).toBe(false);
  });

  it("lets only the phone that joined leave the queue", () => {
    const joined = joinQueue(createMultiSportQueueState(), {
      ...joinBase,
      sportId: "volleyball",
      format: "team",
      displayName: "Aces",
      ownerToken: "phone-1",
    });
    expect(joined.ok).toBe(true);
    if (!joined.ok || !joined.entryId) return;
    expect(leaveQueue(joined.state, joined.entryId, "someone-else").ok).toBe(false);
    const left = leaveQueue(joined.state, joined.entryId, "phone-1");
    expect(left.ok).toBe(true);
    if (!left.ok) return;
    expect(left.state.entries.find((entry) => entry.id === joined.entryId)?.status).toBe("left");
  });

  it("does not let a public player leave a staff-added group", () => {
    const added = staffAddEntry(createMultiSportQueueState(), {
      ...joinBase,
      sportId: "volleyball",
      format: "team",
      displayName: "Walk-ins",
    });
    expect(added.ok).toBe(true);
    if (!added.ok || !added.entryId) return;
    expect(added.state.entries.find((entry) => entry.id === added.entryId)?.ownerToken).toBeNull();
    expect(leaveQueue(added.state, added.entryId, "phone-1").ok).toBe(false);
  });

  it("calls the group that has waited longest and requires a court before play", () => {
    const called = callNext(createMultiSportQueueState(), "pickleball");
    expect(called.ok).toBe(true);
    if (!called.ok) return;
    const alex = called.state.entries.find((entry) => entry.id === "entry-alex");
    expect(alex?.status).toBe("called");
    expect(startMatch(called.state, "entry-alex").ok).toBe(false);
    const assigned = assignCourt(called.state, "entry-alex", "court-1");
    expect(assigned.ok).toBe(true);
    if (!assigned.ok) return;
    const started = startMatch(assigned.state, "entry-alex");
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(countOpenCourts(started.state)).toBe(2);
    const finished = recordMatchResult(started.state, "entry-alex", { winnerSide: "A" });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(countOpenCourts(finished.state)).toBe(3);
    expect(finished.state.entries.find((entry) => entry.id === "entry-alex")?.status).toBe("completed");
  });

  it("refuses a closed court and a court already taken", () => {
    const closed = setCourtClosed(createMultiSportQueueState(), "court-1", true);
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    const called = callNext(closed.state, "pickleball");
    expect(called.ok).toBe(true);
    if (!called.ok) return;
    expect(assignCourt(called.state, "entry-alex", "court-1").ok).toBe(false);
    const openCourt = assignCourt(called.state, "entry-alex", "court-2");
    expect(openCourt.ok).toBe(true);
    if (!openCourt.ok) return;
    const chrisCalled = callNext(openCourt.state, "pickleball");
    expect(chrisCalled.ok).toBe(true);
    if (!chrisCalled.ok) return;
    expect(assignCourt(chrisCalled.state, "entry-chris", "court-2").ok).toBe(false);
  });

  it("keeps a sport that still has a queue", () => {
    expect(removeSport(createMultiSportQueueState(), "pickleball").ok).toBe(false);
    const disabled = setSportEnabled(createMultiSportQueueState(), "pickleball", false);
    expect(disabled.ok).toBe(true);
    if (!disabled.ok) return;
    const joined = joinQueue(disabled.state, {
      ...joinBase,
      sportId: "pickleball",
      format: "singles",
      displayName: "Nia",
      ownerToken: "nia",
    });
    expect(joined.ok).toBe(false);
  });

  it("adds balanced doubles and blocks duplicate active assignments", () => {
    const added = addSkillPairs(createDemoState(), {
      sportId: "pickleball",
      players: [
        { name: "Finn", skillLevel: "expert", checkInOrder: 1, sitOutCount: 0 },
        { name: "Gus", skillLevel: "advanced", checkInOrder: 2, sitOutCount: 0 },
        { name: "Hal", skillLevel: "intermediate", checkInOrder: 3, sitOutCount: 0 },
        { name: "Ivy", skillLevel: "beginner", checkInOrder: 4, sitOutCount: 0 },
        { name: "Jay", skillLevel: "beginner", checkInOrder: 5, sitOutCount: 0 },
      ],
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const game = added.state.entries.find((entry) => entry.format === "doubles" && entry.players.length === 4);
    expect(game?.format).toBe("doubles");
    expect(game?.players).toHaveLength(4);
    expect(game?.ownerToken).toBeNull();
    expect(game ? entryTitle(game) : "").toContain("vs");
    const busyName = game!.players[0];
    const duplicate = addSkillPairs(added.state, {
      sportId: "pickleball",
      players: [
        { name: busyName, skillLevel: "intermediate", checkInOrder: 1, sitOutCount: 0 },
        { name: "Kim", skillLevel: "intermediate", checkInOrder: 2, sitOutCount: 0 },
      ],
    });
    expect(duplicate.ok).toBe(false);
  });

  it("keeps archived history but blocks basketball from new play", () => {
    const state = createDemoState();
    expect(state.sports.some((sport) => sport.id === "basketball")).toBe(false);
    expect(state.entries.some((entry) => entry.sportId === "archived")).toBe(true);
    expect(joinQueue(state, { ...joinBase, sportId: "basketball", format: "team", displayName: "Hoop", ownerToken: "x" }).ok).toBe(
      false,
    );
    expect(addSkillPairs(state, { sportId: "basketball", players: [{ name: "Ana", skillLevel: "intermediate", checkInOrder: 1, sitOutCount: 0 }, { name: "Ben", skillLevel: "intermediate", checkInOrder: 2, sitOutCount: 0 }] }).ok).toBe(false);
  });

  it("records wins, updates standings, and undoes a result", () => {
    let state = createDemoState();
    const live = {
      id: "entry-live",
      sportId: "pickleball",
      format: "singles" as const,
      displayName: "Alex",
      players: ["Alex"],
      courtPreferenceId: null,
      status: "playing" as const,
      joinedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      courtId: "court-1",
      ownerToken: null,
    };
    state = { ...state, entries: [...state.entries, live] };
    const recorded = recordMatchResult(state, "entry-live", { winnerSide: "A", scoreSideA: 11, scoreSideB: 9 });
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) return;
    const alex = recorded.state.players.find((player) => player.name === "Alex");
    expect(alex?.wins).toBe(1);
    expect(alex?.games).toBe(1);
    const undone = undoMatchResult(recorded.state, "entry-live");
    expect(undone.ok).toBe(true);
    if (!undone.ok) return;
    expect(undone.state.entries.find((entry) => entry.id === "entry-live")?.status).toBe("playing");
    expect(undone.state.players.find((player) => player.name === "Alex")?.wins).toBe(0);
  });

  it("rejects a file that is not a backup and accepts the sample queue", () => {
    expect(parseAppState({ hello: "no" }).ok).toBe(false);
    const roundTrip = parseAppState(JSON.parse(JSON.stringify(createDemoState())) as unknown);
    expect(roundTrip.ok).toBe(true);
  });
});
