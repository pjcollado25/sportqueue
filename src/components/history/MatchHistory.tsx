"use client";

import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { EmptyState, FilterChips, PageHeader, StatusBadge } from "@/components/ui/bits";
import { entryTitle, formatLabel, formatTime } from "@/lib/labels";
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
  const { state } = useQueue();
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  if (!state) return null;

  const history = recentFinished(state, 500).filter((entry) => filter === "all" || entry.status === filter);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <PageHeader title="Match history" description="Finished games and people who left the queue stay on this phone." />
      <FilterChips label="History filter" value={filter} onChange={(id) => setFilter(id as (typeof filters)[number]["id"])} options={filters} />
      {history.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Finished games, skipped players, and no-shows will show up here." />
      ) : (
        <ul className="grid gap-3">
          {history.map((entry) => {
            const court = courtName(state, entry.courtId);
            return (
              <li key={entry.id} className="rounded-3xl bg-white p-4">
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
