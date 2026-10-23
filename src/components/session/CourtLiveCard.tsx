"use client";

import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button } from "@/components/ui/Button";
import { OccupancyBadge, SurfaceCard } from "@/components/ui/bits";
import { fieldClass, cn } from "@/lib/cn";
import { entryTitle, formatLabel } from "@/lib/labels";
import { courtOccupancy } from "@/lib/selectors";
import { sessionWaiting } from "@/lib/session-selectors";
import type { Court, QueueEntry } from "@/lib/types";

export function CourtLiveCard({
  court,
  sportId,
  calledUnassigned,
  onReport,
}: {
  court: Court;
  sportId: string;
  calledUnassigned: QueueEntry[];
  onReport: (error: string | null, notice: string) => void;
}) {
  const queue = useQueue();
  const { state, assignCourt, startMatch, recordResult, callNext } = queue;
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");

  if (!state) return null;

  const courtState = courtOccupancy(state, court.id);
  const occupancy = courtState.occupancy;
  const entry = courtState.entry;
  const waiting = sessionWaiting(state);
  const title = entry ? entryTitle(entry) : null;

  function sendGameToThisCourt() {
    const unassigned = calledUnassigned[0];
    if (unassigned) {
      onReport(assignCourt(unassigned.id, court.id), `${unassigned.displayName} assigned to ${court.name}.`);
      return;
    }
    const next = waiting[0];
    if (!next) {
      onReport("Nobody is in Up Next.", "");
      return;
    }
    const callError = callNext(sportId);
    if (callError) {
      onReport(callError, "");
      return;
    }
    onReport(assignCourt(next.id, court.id), `${entryTitle(next)} called to ${court.name}.`);
  }

  return (
    <SurfaceCard
      className={cn(
        "grid gap-3",
        occupancy === "playing" && "ring-2 ring-pine/25",
        occupancy === "reserved" && "ring-2 ring-sand",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-extrabold text-pine">{court.name}</h3>
          {entry ? (
            <p className="mt-1 text-sm font-semibold leading-snug text-pine">{title}</p>
          ) : (
            <p className="mt-1 text-sm text-muted">Open — pull from Up Next</p>
          )}
        </div>
        <OccupancyBadge occupancy={occupancy} />
      </div>

      {entry?.status === "playing" ? (
        <GameResultForm
          scoreA={scoreA}
          scoreB={scoreB}
          onScoreA={setScoreA}
          onScoreB={setScoreB}
          onWinner={(side) =>
            onReport(
              recordResult(entry.id, {
                winnerSide: side,
                scoreSideA: scoreA.trim() === "" ? null : Number(scoreA),
                scoreSideB: scoreB.trim() === "" ? null : Number(scoreB),
              }),
              side === "A" ? "Side A wins — players return to the pool." : "Side B wins — players return to the pool.",
            )
          }
        />
      ) : null}

      {entry?.status === "called" ? (
        <div className="grid gap-2">
          <p className="text-xs text-muted">{formatLabel(entry.format)} · Players on court? Tap start.</p>
          <Button full onClick={() => onReport(startMatch(entry.id), `Game started on ${court.name}.`)}>
            Start game
          </Button>
        </div>
      ) : null}

      {occupancy === "open" ? (
        <Button
          full
          variant={waiting.length > 0 || calledUnassigned.length > 0 ? "primary" : "secondary"}
          disabled={waiting.length === 0 && calledUnassigned.length === 0}
          onClick={sendGameToThisCourt}
        >
          {calledUnassigned.length > 0
            ? `Assign ${entryTitle(calledUnassigned[0])} here`
            : waiting.length > 0
              ? "Call Up Next here"
              : "Waiting for Up Next"}
        </Button>
      ) : null}
    </SurfaceCard>
  );
}

function GameResultForm({
  scoreA,
  scoreB,
  onScoreA,
  onScoreB,
  onWinner,
}: {
  scoreA: string;
  scoreB: string;
  onScoreA: (value: string) => void;
  onScoreB: (value: string) => void;
  onWinner: (side: "A" | "B") => void;
}) {
  return (
    <div className="grid gap-2 rounded-2xl bg-foam/70 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">Record result</p>
      <p className="text-sm text-muted">Optional scores break ranking ties.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-bold text-muted">
          Side A
          <input
            className={cn(fieldClass, "mt-1")}
            placeholder="Score"
            inputMode="numeric"
            value={scoreA}
            onChange={(event) => onScoreA(event.target.value)}
          />
        </label>
        <label className="text-xs font-bold text-muted">
          Side B
          <input
            className={cn(fieldClass, "mt-1")}
            placeholder="Score"
            inputMode="numeric"
            value={scoreB}
            onChange={(event) => onScoreB(event.target.value)}
          />
        </label>
      </div>
      <Button full onClick={() => onWinner("A")}>Side A wins</Button>
      <Button variant="secondary" full onClick={() => onWinner("B")}>Side B wins</Button>
    </div>
  );
}
