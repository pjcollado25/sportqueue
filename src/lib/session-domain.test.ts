import { createDemoState } from "@/lib/defaults";
import {
  addPlayersToRoster,
  checkInAllPlayers,
  checkInPlayer,
  generateStagedGame,
  sendStagedGameToQueue,
  startPlaySession,
} from "@/lib/session-domain";
import type { AppState } from "@/lib/types";
import { describe, expect, it } from "vitest";

describe("play session workflow", () => {
  it("starts a session with courts and builds a staged doubles game", () => {
    let state = createDemoState();
    const names = addPlayersToRoster(state, ["P1", "P2", "P3", "P4", "P5"]);
    expect(names.ok).toBe(true);
    if (!names.ok) return;
    state = names.state;
    const started = startPlaySession(state, { courtCount: 3, format: "doubles" });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    state = started.state;
    for (const player of state.players) {
      const checked = checkInPlayer(state, player.id);
      expect(checked.ok).toBe(true);
      if (!checked.ok) return;
      state = checked.state;
    }
    const staged = generateStagedGame(state);
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    expect(staged.state.playSession?.staged?.sideA).toHaveLength(2);
    const queued = sendStagedGameToQueue(staged.state);
    expect(queued.ok).toBe(true);
    if (!queued.ok) return;
    expect(queued.state.entries.some((entry) => entry.status === "waiting" && entry.players.length === 4)).toBe(true);
  });

  it("checks in every roster player who is not already in or on court", () => {
    let state: AppState = { ...createDemoState(), players: [] };
    const names = addPlayersToRoster(state, ["A1", "A2", "A3"]);
    expect(names.ok).toBe(true);
    if (!names.ok) return;
    state = names.state;
    const started = startPlaySession(state, { courtCount: 2, format: "doubles" });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    state = started.state;
    const bulk = checkInAllPlayers(state);
    expect(bulk.ok).toBe(true);
    if (!bulk.ok) return;
    expect(bulk.added).toBe(3);
    expect(bulk.skipped).toEqual([]);
    expect(bulk.state.playSession?.checkedInPlayerIds).toHaveLength(3);
  });
});
