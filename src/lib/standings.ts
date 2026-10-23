import { playerNameKey, skillLevelShort } from "@/lib/skill";
import type { AppState, PlayerProfile } from "@/lib/types";

export interface StandingRow {
  id: string;
  name: string;
  skillLabel: string;
  wins: number;
  losses: number;
  games: number;
  winPct: number;
  pointDiff: number | null;
  ranked: boolean;
}

function winPct(wins: number, games: number): number {
  if (games <= 0) return 0;
  return wins / games;
}

function compareStandings(a: StandingRow, b: StandingRow): number {
  if (a.wins !== b.wins) return b.wins - a.wins;
  if (a.winPct !== b.winPct) return b.winPct - a.winPct;
  const aDiff = a.pointDiff;
  const bDiff = b.pointDiff;
  if (aDiff !== null && bDiff !== null && aDiff !== bDiff) return bDiff - aDiff;
  return a.name.localeCompare(b.name);
}

export function buildStandings(state: AppState): StandingRow[] {
  const minGames = state.session.minGamesForRanking;
  const allScored = state.entries
    .filter((entry) => entry.status === "completed" && entry.winnerSide)
    .every((entry) => entry.scoreSideA !== null && entry.scoreSideB !== null);

  const rows = state.players.map((player) => {
    const pointDiff =
      player.games > 0 && player.pointsFor + player.pointsAgainst > 0
        ? player.pointsFor - player.pointsAgainst
        : null;
    const games = player.games;
    return {
      id: player.id,
      name: player.name,
      skillLabel: skillLevelShort(player.skillLevel),
      wins: player.wins,
      losses: player.losses,
      games,
      winPct: winPct(player.wins, games),
      pointDiff: allScored ? pointDiff : null,
      ranked: games >= minGames,
    };
  });

  const ranked = rows.filter((row) => row.ranked).sort(compareStandings);
  const unranked = rows.filter((row) => !row.ranked).sort((a, b) => a.name.localeCompare(b.name));
  return [...ranked, ...unranked];
}

export function findPlayerByName(state: AppState, name: string): PlayerProfile | undefined {
  const key = playerNameKey(name);
  return state.players.find((player) => playerNameKey(player.name) === key);
}
