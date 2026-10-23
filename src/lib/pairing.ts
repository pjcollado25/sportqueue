import type { SkillLevel } from "@/lib/skill";
import { partnerHistoryKey, playerNameKey, skillLevelWeight } from "@/lib/skill";

export const MAX_PAIR_PLAYERS = 24;

export interface RankedPlayer {
  name: string;
  skillLevel: SkillLevel | null;
  checkInOrder: number;
  sitOutCount: number;
}

export interface DoublesSide {
  players: [string, string];
}

export interface SkillGame {
  sideA: DoublesSide;
  sideB: DoublesSide;
}

export interface SkillPairing {
  games: SkillGame[];
  waitingPair: DoublesSide | null;
  sittingOut: string | null;
}

export interface PairingContext {
  partnerHistory: ReadonlySet<string>;
}

export type PairingResult = { ok: true; pairing: SkillPairing } | { ok: false; error: string };

export function pairLine(players: readonly [string, string]): string {
  return `${players[0]} & ${players[1]}`;
}

function fail(error: string): PairingResult {
  return { ok: false, error };
}

type InternalPlayer = RankedPlayer & { key: string; weight: number; index: number };

function sitOutRank(player: InternalPlayer): number {
  if (!player.skillLevel) return -1;
  return skillLevelWeight(player.skillLevel);
}

/** Lowest skill rating sits when the count is odd (unrated treated as lowest). */
function chooseSitOut(players: InternalPlayer[]): InternalPlayer {
  return [...players].sort(
    (a, b) => sitOutRank(a) - sitOutRank(b) || a.checkInOrder - b.checkInOrder || a.index - b.index,
  )[0];
}

function partnerPenalty(a: InternalPlayer, b: InternalPlayer, history: ReadonlySet<string>): number {
  return history.has(partnerHistoryKey(a.name, b.name)) ? 100 : 0;
}

function sideWeight(side: DoublesSide, lookup: Map<string, InternalPlayer>): number {
  const one = lookup.get(playerNameKey(side.players[0]));
  const two = lookup.get(playerNameKey(side.players[1]));
  return (one?.weight ?? 3.5) + (two?.weight ?? 3.5);
}

function pairRemaining(players: InternalPlayer[], history: ReadonlySet<string>): DoublesSide[] {
  if (players.length <= 6) {
    return enumeratePairs(players, history);
  }
  return greedyPairs(players, history);
}

function enumeratePairs(players: InternalPlayer[], history: ReadonlySet<string>): DoublesSide[] {
  let bestPairs: DoublesSide[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  function walk(remaining: InternalPlayer[], built: DoublesSide[]): void {
    if (remaining.length === 0) {
      const score = scorePairsWithHistory(built, players, history);
      if (score < bestScore) {
        bestScore = score;
        bestPairs = built;
      }
      return;
    }
    const first = remaining[0];
    for (let index = 1; index < remaining.length; index += 1) {
      const partner = remaining[index];
      const side: DoublesSide = { players: [first.name, partner.name] };
      const next = remaining.filter((player) => player !== first && player !== partner);
      walk(next, [...built, side]);
    }
  }

  walk(players, []);
  if (bestPairs === null) return greedyPairs(players, history);
  return bestPairs;
}

function scorePairsWithHistory(pairs: DoublesSide[], players: InternalPlayer[], history: ReadonlySet<string>): number {
  const lookup = new Map(players.map((player) => [player.key, player]));
  let score = 0;
  for (const side of pairs) {
    const a = lookup.get(playerNameKey(side.players[0]));
    const b = lookup.get(playerNameKey(side.players[1]));
    if (a && b) {
      score += partnerPenalty(a, b, history);
      score += Math.abs(a.weight - b.weight) * 2;
    }
  }
  for (let index = 0; index < pairs.length; index += 2) {
    const sideB = pairs[index + 1];
    if (!sideB) break;
    score += Math.abs(sideWeight(pairs[index], lookup) - sideWeight(sideB, lookup)) * 10;
  }
  return score;
}

function greedyPairs(players: InternalPlayer[], history: ReadonlySet<string>): DoublesSide[] {
  const remaining = [...players].sort((a, b) => a.checkInOrder - b.checkInOrder || a.index - b.index);
  const pairs: DoublesSide[] = [];
  while (remaining.length >= 2) {
    const first = remaining.shift()!;
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const partner = remaining[index];
      const penalty = partnerPenalty(first, partner, history);
      const balance = Math.abs(first.weight - partner.weight);
      const score = penalty + balance;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    const partner = remaining.splice(bestIndex, 1)[0];
    pairs.push({ players: [first.name, partner.name] });
  }
  return pairs;
}

export function pickSkillPairs(players: RankedPlayer[], context: PairingContext = { partnerHistory: new Set() }): PairingResult {
  if (players.length > MAX_PAIR_PLAYERS) return fail(`Add up to ${MAX_PAIR_PLAYERS} names.`);
  const cleaned = players.map((player, index) => ({
    name: player.name.trim(),
    skillLevel: player.skillLevel,
    checkInOrder: player.checkInOrder,
    sitOutCount: player.sitOutCount,
    index,
    key: playerNameKey(player.name),
    weight: skillLevelWeight(player.skillLevel),
  }));
  if (cleaned.length < 2) return fail("Add at least two names so a pair can be made.");
  if (cleaned.some((player) => player.name.length < 1)) return fail("Enter a name for each player.");
  if (cleaned.some((player) => player.name.length > 40)) return fail("Use 40 characters or fewer for each name.");

  const seen = new Set<string>();
  for (const player of cleaned) {
    if (seen.has(player.key)) return fail(`${player.name} is already on the list.`);
    seen.add(player.key);
  }

  let pool: InternalPlayer[] = cleaned;
  let sittingOut: string | null = null;
  if (pool.length % 2 === 1) {
    const sit = chooseSitOut(pool);
    sittingOut = sit.name;
    pool = pool.filter((player) => player !== sit);
  }

  const sides = pairRemaining(pool, context.partnerHistory);
  const games: SkillGame[] = [];
  let waitingPair: DoublesSide | null = null;
  for (let index = 0; index < sides.length; index += 2) {
    const sideB = sides[index + 1];
    if (!sideB) {
      waitingPair = sides[index];
      break;
    }
    games.push({ sideA: sides[index], sideB });
  }

  return { ok: true, pairing: { games, waitingPair, sittingOut } };
}

/** @deprecated Use skill levels via RankedPlayer.skillLevel */
export const SKILL_MIN = 1;
export const SKILL_MAX = 6;
