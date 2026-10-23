"use client";

import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { EmptyState, FilterChips, PageHeader, StatusBadge, SurfaceCard } from "@/components/ui/bits";
import { entryTitle, formatLabel, formatTime } from "@/lib/labels";
import { Button } from "@/components/ui/Button";
import { courtName, recentFinished, sportName } from "@/lib/selectors";
import type { EntryStatus } from "@/lib/types";

const filters: { id: "all" | EntryStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "completed", label: "Finished" },
  { id: "skipped", label: "Skipped" },
  { id: "no_show", label: "No-show" },
  { id: "left", label: "Left" },
  { id: "removed", label: "Removed" },
];

export function MatchHistory() {
  const { state, undoResult } = useQueue();
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [error, setError] = useState<string | null>(null);
  if (!state) return null;

  const history = recentFinished(state, 500).filter((entry) => filter === "all" || entry.status === filter);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <PageHeader
        eyebrow="Archive"
        title="Game history"
        description="Finished games stay on this phone. Older sports (including past basketball) stay in the archive — new sessions are pickleball only."
      />
      <FilterChips label="History filter" value={filter} onChange={(id) => setFilter(id as (typeof filters)[number]["id"])} options={filters} />
      {error ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
      {history.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Finished games, skipped players, and no-shows will show up here." />
      ) : (
        <ul className="grid gap-3">
          {history.map((entry) => {
            const court = courtName(state, entry.courtId);
            return (
              <li key={entry.id}>
                <SurfaceCard>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-muted">
                      {sportName(state, entry.sportId)} · {formatLabel(entry.format)}
                    </p>
                    <h2 className="break-words text-xl font-extrabold text-pine">{entryTitle(entry)}</h2>
                  </div>
                  <StatusBadge status={entry.status} />
                </div>
                <p className="mt-3 text-base text-muted">
                  {[court, formatTime(entry.endedAt)].filter(Boolean).join(" · ") || "Time not recorded"}
                </p>
                {entry.winnerSide ? (
                  <p className="mt-1 text-sm font-semibold text-pine">
                    Winner: side {entry.winnerSide}
                    {entry.scoreSideA != null && entry.scoreSideB != null
                      ? ` · ${entry.scoreSideA}–${entry.scoreSideB}`
                      : " · No score recorded"}
                  </p>
                ) : null}
                {entry.resultUndo ? (
                  <Button
                    variant="secondary"
                    full
                    className="mt-3"
                    onClick={() => setError(undoResult(entry.id))}
                  >
                    Undo result
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
