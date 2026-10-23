"use client";

import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/bits";
import { SkillLevelPicker, SkillLevelStars } from "@/components/ui/SkillLevelPicker";
import { fieldClass, cn } from "@/lib/cn";
import { skillLevelShort } from "@/lib/skill";
import { playerAvailability } from "@/lib/session-selectors";
import type { PlayerProfile } from "@/lib/types";

const availabilityLabel = {
  checked_out: "Not checked in",
  waiting: "Checked in · waiting",
  queued: "Up Next",
  called: "Called",
  playing: "On court",
} as const;

const availabilityTone = {
  checked_out: "bg-line text-muted",
  waiting: "border border-pine/20 bg-pine/[0.06] text-pine",
  queued: "bg-sand text-clay",
  called: "bg-sand text-clay",
  playing: "bg-pine text-lime",
} as const;

export function SessionRosterPanel({
  mode,
  variant = "full",
  draftCheckedIn,
  onDraftToggle,
  onReport,
  showBulkImport = true,
}: {
  mode: "setup" | "live" | "roster";
  variant?: "full" | "compact";
  draftCheckedIn?: Set<string>;
  onDraftToggle?: (playerId: string, checked: boolean) => void;
  onReport: (error: string | null, notice: string) => void;
  showBulkImport?: boolean;
}) {
  const queue = useQueue();
  const { state } = queue;
  const [quickName, setQuickName] = useState("");
  const [bulk, setBulk] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  if (!state) return null;

  const players = [...state.players].sort((a, b) => a.name.localeCompare(b.name));
  const sessionActive = Boolean(state.playSession);

  function isCheckedIn(player: PlayerProfile): boolean {
    if (mode === "roster") return false;
    if (mode === "setup") return draftCheckedIn?.has(player.id) ?? false;
    if (!sessionActive) return false;
    return state!.playSession!.checkedInPlayerIds.includes(player.id);
  }

  function toggleCheckIn(player: PlayerProfile) {
    const checked = isCheckedIn(player);
    if (mode === "roster") return;
    if (mode === "setup") {
      onDraftToggle?.(player.id, !checked);
      return;
    }
    if (checked) onReport(queue.checkOut(player.id), `${player.name} checked out.`);
    else onReport(queue.checkIn(player.id), `${player.name} checked in.`);
  }

  const compact = variant === "compact";

  return (
    <div className="grid gap-3">
      {!compact || mode === "live" ? (
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const name = quickName.trim();
          if (!name) return;
          const message = queue.addPlayers([name]);
          onReport(message, `${name} added.`);
          if (!message) {
            setQuickName("");
            if (mode === "setup") {
              const added = queue.getSnapshot().state?.players.find(
                (player) => player.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
              );
              if (added) onDraftToggle?.(added.id, true);
            }
          }
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Player name</span>
          <input
            className={fieldClass}
            value={quickName}
            onChange={(event) => setQuickName(event.target.value)}
            placeholder="Add a player"
            maxLength={40}
            enterKeyHint="done"
          />
        </label>
        <Button type="submit" className="shrink-0">Add</Button>
      </form>
      ) : null}

      {!compact && showBulkImport ? (
        <details
          className="rounded-2xl border border-line/80 bg-foam/40 px-3 py-2"
          open={bulkOpen}
          onToggle={(event) => setBulkOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-bold text-pine marker:content-none list-none [&::-webkit-details-marker]:hidden">
            Import several names
          </summary>
          <form
            className="mt-3 grid gap-2 border-t border-line/60 pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              const names = bulk.split(/[\n,]+/).map((part) => part.trim()).filter(Boolean);
              const message = queue.addPlayers(names);
              onReport(message, `${names.length} player(s) added.`);
              if (!message) {
                setBulk("");
                if (mode === "setup") {
                  for (const name of names) {
                    const player = state!.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
                    if (player) onDraftToggle?.(player.id, true);
                  }
                }
              }
            }}
          >
            <textarea
              className={cn(fieldClass, "min-h-20")}
              value={bulk}
              onChange={(event) => setBulk(event.target.value)}
              placeholder="Ana, Ben, Cam"
              aria-label="Import player names"
            />
            <Button type="submit" variant="secondary" full>Add all</Button>
          </form>
        </details>
      ) : null}

      {players.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white/80 px-4 py-4 text-center text-sm text-muted">
          Add at least one player to continue.
        </p>
      ) : (
        <ul className="grid gap-2">
          {players.map((player) => {
            const checkedInNow = isCheckedIn(player);
            const status =
              mode === "roster"
                ? "checked_out"
                : sessionActive
                  ? playerAvailability(state, player)
                  : checkedInNow
                    ? "waiting"
                    : "checked_out";
            return (
              <li key={player.id}>
                <SurfaceCard className="grid gap-3 !p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-lg font-extrabold text-pine">{player.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <SkillLevelStars level={player.skillLevel} size="sm" />
                        <span className="text-xs font-bold text-muted">{skillLevelShort(player.skillLevel)}</span>
                      </div>
                      {mode !== "roster" ? (
                        <span
                          className={cn(
                            "mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold",
                            availabilityTone[status],
                          )}
                        >
                          {availabilityLabel[status]}
                        </span>
                      ) : null}
                    </div>
                    {mode !== "roster" ? (
                      <Button
                        variant={checkedInNow ? "secondary" : "primary"}
                        className="shrink-0"
                        onClick={() => toggleCheckIn(player)}
                      >
                        {checkedInNow ? "Undo" : "Check in"}
                      </Button>
                    ) : null}
                  </div>
                  {compact ? (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-bold text-pine">Adjust play level</summary>
                      <div className="mt-2">
                        <SkillLevelPicker
                          id={`roster-${mode}-${player.id}`}
                          label="Play level"
                          value={player.skillLevel}
                          onChange={(level) => onReport(queue.setPlayerSkill(player.id, level), "Play level updated.")}
                        />
                      </div>
                    </details>
                  ) : (
                    <SkillLevelPicker
                      id={`roster-${mode}-${player.id}`}
                      label="Play level (for balancing)"
                      value={player.skillLevel}
                      onChange={(level) => onReport(queue.setPlayerSkill(player.id, level), "Play level updated.")}
                    />
                  )}
                  {!compact ? (
                  <Button variant="danger" full onClick={() => onReport(queue.removePlayer(player.id), `${player.name} removed.`)}>
                    Remove
                  </Button>
                  ) : null}
                </SurfaceCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
