import { createDemoState } from "@/lib/defaults";
import {
  addSkillPairs,
  assignCourt,
  callNext,
  finishMatch,
  joinQueue,
  leaveQueue,
  removeSport,
  setCourtClosed,
  setSportEnabled,
  staffAddEntry,
  startMatch,
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
    const joined = joinQueue(createDemoState(), {
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
    const joined = joinQueue(createDemoState(), {
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
    const first = joinQueue(createDemoState(), {
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
    const joined = joinQueue(createDemoState(), {
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
    const added = staffAddEntry(createDemoState(), {
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
    const called = callNext(createDemoState(), "pickleball");
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
    expect(countOpenCourts(started.state)).toBe(3);
    const finished = finishMatch(started.state, "entry-alex");
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(countOpenCourts(finished.state)).toBe(4);
  });

  it("refuses a closed court and a court already taken", () => {
    const closed = setCourtClosed(createDemoState(), "court-1", true);
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
    expect(removeSport(createDemoState(), "pickleball").ok).toBe(false);
    const disabled = setSportEnabled(createDemoState(), "pickleball", false);
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

  it("adds balanced doubles from a skill ranking and leaves the lowest player out", () => {
    const added = addSkillPairs(createDemoState(), {
      sportId: "pickleball",
      players: [
        { name: "Ana", skill: 5 },
        { name: "Ben", skill: 4 },
        { name: "Cam", skill: 2 },
        { name: "Dee", skill: 1 },
        { name: "Eli", skill: 1 },
      ],
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const game = added.state.entries.find((entry) => entry.players.includes("Ana"));
    expect(game?.format).toBe("doubles");
    expect(game?.players).toEqual(["Ana", "Dee", "Ben", "Cam"]);
    expect(game?.ownerToken).toBeNull();
    expect(game ? entryTitle(game) : "").toBe("Ana & Dee vs Ben & Cam");
    expect(added.state.entries.some((entry) => entry.players.includes("Eli"))).toBe(false);
    expect(addSkillPairs(added.state, { sportId: "basketball", players: [{ name: "Ana", skill: 3 }, { name: "Ben", skill: 3 }] }).ok).toBe(false);
  });

  it("rejects a file that is not a backup and accepts the sample queue", () => {
    expect(parseAppState({ hello: "no" }).ok).toBe(false);
    const roundTrip = parseAppState(JSON.parse(JSON.stringify(createDemoState())) as unknown);
    expect(roundTrip.ok).toBe(true);
  });
});
