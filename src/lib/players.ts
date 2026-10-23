import { createId } from "@/lib/ids";
import { playerNameKey } from "@/lib/skill";
import type { SkillLevel } from "@/lib/skill";
import type { AppState, PlayerProfile } from "@/lib/types";

export function nextCheckInOrder(state: AppState): number {
  if (state.players.length === 0) return 1;
  return Math.max(...state.players.map((player) => player.checkInOrder)) + 1;
}

export function upsertPlayerNames(state: AppState, names: string[], nowOrder?: number): AppState {
  let players = state.players;
  let order = nowOrder ?? nextCheckInOrder(state);
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = playerNameKey(name);
    const existing = players.find((player) => playerNameKey(player.name) === key);
    if (existing) continue;
    const profile: PlayerProfile = {
      id: `player-${createId()}`,
      name,
      skillLevel: null,
      checkInOrder: order,
      sitOutCount: 0,
      wins: 0,
      losses: 0,
      games: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
    players = [...players, profile];
    order += 1;
  }
  return { ...state, players };
}

export function activePlayerNames(state: AppState): Set<string> {
  const names = new Set<string>();
  for (const entry of state.entries) {
    if (entry.status !== "waiting" && entry.status !== "called" && entry.status !== "playing") continue;
    for (const player of entry.players) {
      names.add(playerNameKey(player));
    }
  }
  return names;
}

export function rankedPlayersFromRoster(state: AppState, names: string[]): Array<{
  name: string;
  skillLevel: SkillLevel | null;
  checkInOrder: number;
  sitOutCount: number;
}> {
  return names.map((name) => {
    const profile = state.players.find((player) => playerNameKey(player.name) === playerNameKey(name));
    return {
      name: profile?.name ?? name.trim(),
      skillLevel: profile?.skillLevel ?? null,
      checkInOrder: profile?.checkInOrder ?? Number.MAX_SAFE_INTEGER,
      sitOutCount: profile?.sitOutCount ?? 0,
    };
  });
}
