export const SKILL_MIN = 1;
export const SKILL_MAX = 5;
export const MAX_PAIR_PLAYERS = 24;

export interface RankedPlayer {
  name: string;
  skill: number;
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

export type PairingResult = { ok: true; pairing: SkillPairing } | { ok: false; error: string };

export function pairLine(players: readonly [string, string]): string {
  return `${players[0]} & ${players[1]}`;
}

function fail(error: string): PairingResult {
  return { ok: false, error };
}

export function pickSkillPairs(players: RankedPlayer[]): PairingResult {
  if (players.length > MAX_PAIR_PLAYERS) return fail(`Add up to ${MAX_PAIR_PLAYERS} names.`);
  const cleaned = players.map((player) => ({ name: player.name.trim(), skill: player.skill }));
  if (cleaned.length < 2) return fail("Add at least two names so a pair can be made.");
  if (cleaned.some((player) => player.name.length < 1)) return fail("Enter a name for each player.");
  if (cleaned.some((player) => player.name.length > 40)) return fail("Use 40 characters or fewer for each name.");
  if (cleaned.some((player) => !Number.isInteger(player.skill) || player.skill < SKILL_MIN || player.skill > SKILL_MAX)) {
    return fail("Rank each player from 1 to 5. 5 is strongest.");
  }

  const seen = new Set<string>();
  for (const player of cleaned) {
    const key = player.name.toLocaleLowerCase();
    if (seen.has(key)) return fail(`${player.name} is already on the list.`);
    seen.add(key);
  }

  const ranked = cleaned
    .map((player, index) => ({ ...player, index }))
    .sort((a, b) => b.skill - a.skill || a.index - b.index);

  const sittingOut = ranked.length % 2 === 1 ? ranked.pop()!.name : null;
  const sides: DoublesSide[] = [];
  for (let index = 0; index < ranked.length / 2; index += 1) {
    const strong = ranked[index];
    const newer = ranked[ranked.length - 1 - index];
    sides.push({ players: [strong.name, newer.name] });
  }

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
