"use client";

import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/bits";
import { fieldClass, cn } from "@/lib/cn";
import { buildStandings } from "@/lib/standings";

export function StandingsPanel() {
  const { state, setMinGamesForRanking } = useQueue();
  const [minGames, setMinGames] = useState(state?.session.minGamesForRanking ?? 3);
  const [minGamesSource, setMinGamesSource] = useState(state?.session.minGamesForRanking ?? 3);
  const [error, setError] = useState<string | null>(null);
  if (!state) return null;

  if (minGamesSource !== state.session.minGamesForRanking) {
    setMinGamesSource(state.session.minGamesForRanking);
    setMinGames(state.session.minGamesForRanking);
  }

  const rows = buildStandings(state);

  return (
    <SurfaceCard className="grid gap-3">
      <h2 className="text-lg font-extrabold text-pine">Session standings</h2>
      <p className="text-sm leading-6 text-muted">Ranked by wins, then win percentage. Point differential breaks ties only when every finished game has a score.</p>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(setMinGamesForRanking(minGames));
        }}
      >
        <label>
          <span className="text-sm font-bold">Minimum games to rank</span>
          <input
            className={cn(fieldClass, "mt-2 w-24")}
            type="number"
            min={1}
            max={20}
            value={minGames}
            onChange={(event) => setMinGames(Number(event.target.value))}
          />
        </label>
        <Button type="submit">Save</Button>
      </form>
      {error ? <p role="alert" className="text-sm font-bold text-danger">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="text-base text-muted">No players yet.</p>
      ) : (
        <ol className="grid gap-2">
          {rows.map((row, index) => {
            const rank = rows.slice(0, index + 1).filter((item) => item.ranked).length;
            return (
            <li key={row.id} className="rounded-2xl bg-foam px-4 py-3">
              <p className="text-sm font-bold text-muted">
                {row.ranked ? `#${rank}` : "Unranked"} · {row.skillLabel}
              </p>
              <p className="text-base font-extrabold text-pine">{row.name}</p>
              <p className="text-sm text-muted">
                {row.wins} wins · {row.losses} losses · {Math.round(row.winPct * 100)}% win rate
                {row.pointDiff !== null ? ` · ${row.pointDiff >= 0 ? "+" : ""}${row.pointDiff} pts` : ""}
              </p>
            </li>
            );
          })}
        </ol>
      )}
    </SurfaceCard>
  );
}
