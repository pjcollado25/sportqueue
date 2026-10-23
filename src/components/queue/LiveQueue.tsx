"use client";

import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, FilterChips, PageHeader, StatusBadge } from "@/components/ui/bits";
import { useNow } from "@/lib/use-now";
import { entryPlayersLine, entryTitle, formatLabel, statusLabel, waitLabel } from "@/lib/labels";
import { courtName, filterSportsForHistory, listByStatus, myActiveEntries, queuePosition, sportName, upNextEntries } from "@/lib/selectors";
import { isActiveStatus, type QueueEntry } from "@/lib/types";

export function LiveQueue() {
  const { state, playerToken, leave } = useQueue();
  const now = useNow();
  const [sportId, setSportId] = useState("all");
  const [leaving, setLeaving] = useState<QueueEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!state) return null;

  const mine = myActiveEntries(state, playerToken);
  const mineIds = new Set(mine.map((entry) => entry.id));
  const sportFilter = sportId === "all" ? undefined : sportId;
  const playing = listByStatus(state, "playing", sportFilter).filter((entry) => !mineIds.has(entry.id));
  const called = listByStatus(state, "called", sportFilter).filter((entry) => !mineIds.has(entry.id));
  const waiting = listByStatus(state, "waiting", sportFilter).filter((entry) => !mineIds.has(entry.id));
  const empty = playing.length === 0 && called.length === 0 && waiting.length === 0 && mine.length === 0;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <PageHeader title="Live queue" description="See who is playing, who is called, and who is waiting." />
      <FilterChips
        label="Sport"
        value={sportId}
        onChange={setSportId}
        options={[{ id: "all", label: "All sports" }, ...filterSportsForHistory(state).map((sport) => ({ id: sport.id, label: sport.name }))]}
      />
      {error ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}

      {mine.length > 0 ? (
        <section className="grid gap-2">
          <h2 className="text-lg font-extrabold text-pine">Your spot</h2>
          {mine.map((entry) => (
            <QueueCard key={entry.id} entry={entry} now={now} highlight onLeave={() => setLeaving(entry)} />
          ))}
        </section>
      ) : null}

      <UpNextSection sportId={sportFilter} />

      {empty ? (
        <EmptyState
          title="The queue is empty"
          body="Nobody is waiting right now. You can be the first to join."
          action={<ButtonLink href="/join">Join queue</ButtonLink>}
        />
      ) : (
        <>
          <QueueSection title="Playing now" entries={playing} now={now} empty="Nobody is playing." />
          <QueueSection title="Called" entries={called} now={now} empty="Nobody has been called." />
          <QueueSection title="Waiting" entries={waiting} now={now} empty="Nobody is waiting." />
        </>
      )}

      {leaving ? (
        <ConfirmDialog
          danger
          title="Leave the queue?"
          body={
            leaving.status === "called"
              ? "Staff may already be calling you. You will lose this place."
              : "You will lose your place and need to join again."
          }
          confirmLabel="Leave queue"
          onCancel={() => setLeaving(null)}
          onConfirm={() => {
            const message = leave(leaving.id);
            setLeaving(null);
            setError(message);
          }}
        />
      ) : null}
    </div>
  );
}

function UpNextSection({ sportId }: { sportId?: string }) {
  const { state } = useQueue();
  if (!state) return null;
  const upNext = upNextEntries(state, sportId);
  if (upNext.length === 0) return null;
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-extrabold text-pine">Up next</h2>
      <ul className="grid gap-2">
        {upNext.map((entry, index) => (
          <li key={entry.id} className="rounded-3xl bg-sand px-4 py-3">
            <p className="text-sm font-bold text-muted">
              {index === 0 ? "Next" : `Then #${index + 1}`} · {sportName(state, entry.sportId)}
            </p>
            <p className="text-base font-extrabold text-pine">{entryTitle(entry)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QueueSection({
  title,
  entries,
  now,
  empty,
}: {
  title: string;
  entries: QueueEntry[];
  now: number;
  empty: string;
}) {
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-extrabold text-pine">{title}</h2>
      {entries.length === 0 ? <p className="text-base text-muted">{empty}</p> : entries.map((entry) => <QueueCard key={entry.id} entry={entry} now={now} />)}
    </section>
  );
}

function QueueCard({
  entry,
  now,
  highlight = false,
  onLeave,
}: {
  entry: QueueEntry;
  now: number;
  highlight?: boolean;
  onLeave?: () => void;
}) {
  const { state } = useQueue();
  if (!state) return null;
  const position = queuePosition(state, entry.id);
  const court = courtName(state, entry.courtId);
  const preference = courtName(state, entry.courtPreferenceId);
  const players = entryPlayersLine(entry);
  const canLeave = highlight && (entry.status === "waiting" || entry.status === "called");

  return (
    <article className={highlight ? "rounded-3xl bg-white p-4 ring-2 ring-lime" : "rounded-3xl bg-white p-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted">
            {sportName(state, entry.sportId)} · {formatLabel(entry.format)}
          </p>
          <h3 className="break-words text-xl font-extrabold text-pine">{entryTitle(entry)}</h3>
          {players ? <p className="mt-1 text-sm text-muted">{players}</p> : null}
        </div>
        <StatusBadge status={entry.status} />
      </div>
      <p className="mt-3 text-base">
        {entry.status === "waiting" ? waitLabel(entry.joinedAt, now) : null}
        {entry.status === "called" ? (court ? `Go to ${court}` : "Waiting for a court") : null}
        {entry.status === "playing" ? (court ? `On ${court}` : "Playing now") : null}
        {!isActiveStatus(entry.status) ? statusLabel(entry.status) : null}
      </p>
      {entry.status === "waiting" && position ? <p className="mt-1 text-base font-extrabold text-pine">Place {position}</p> : null}
      {entry.status === "waiting" && preference ? <p className="mt-1 text-sm text-muted">Asked for {preference}</p> : null}
      {canLeave ? (
        <Button variant="secondary" full className="mt-4" onClick={onLeave}>
          Leave queue
        </Button>
      ) : null}
      {highlight && entry.status === "playing" ? (
        <p className="mt-3 text-sm text-muted">Ask staff when the game is finished.</p>
      ) : null}
    </article>
  );
}
