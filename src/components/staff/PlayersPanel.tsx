"use client";

import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button } from "@/components/ui/Button";
import { SkillLevelPicker } from "@/components/ui/SkillLevelPicker";

export function PlayersPanel() {
  const { state, setPlayerSkill, removePlayer } = useQueue();
  const [error, setError] = useState<string | null>(null);
  if (!state) return null;

  const players = [...state.players].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="grid gap-3 rounded-3xl bg-white p-4">
      <h2 className="text-lg font-extrabold text-pine">Player list &amp; play levels</h2>
      <p className="text-sm leading-6 text-muted">
        Star levels are estimates for balancing doubles — not session rankings. Data stays in this browser until you export a backup.
      </p>
      {error ? (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
      {players.length === 0 ? (
        <p className="text-base text-muted">Players appear here when they join the queue or you add them.</p>
      ) : (
        <ul className="grid gap-3">
          {players.map((player) => (
            <li key={player.id} className="rounded-2xl border border-line p-3">
              <p className="text-base font-extrabold text-pine">{player.name}</p>
              <p className="mt-1 text-sm text-muted">
                Session: {player.wins}W–{player.losses}L · {player.games} games
              </p>
              <div className="mt-3">
                <SkillLevelPicker
                  id={`staff-play-level-${player.id}`}
                  value={player.skillLevel}
                  onChange={(skill) => setError(setPlayerSkill(player.id, skill))}
                />
              </div>
              <Button
                variant="danger"
                full
                className="mt-3"
                onClick={() => {
                  const message = removePlayer(player.id);
                  setError(message);
                }}
              >
                Remove from list
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
