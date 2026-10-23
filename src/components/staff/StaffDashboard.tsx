"use client";

import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FilterChips, PageHeader } from "@/components/ui/bits";
import { fieldClass, cn } from "@/lib/cn";
import { entryTitle, formatHint, formatLabel } from "@/lib/labels";
import { assignableCourts, listByStatus, nextWaiting, sportById } from "@/lib/selectors";
import type { PlayFormat, QueueEntry } from "@/lib/types";

type ConfirmState = {
  title: string;
  body: string;
  confirmLabel: string;
  action: () => void;
};

export function StaffDashboard() {
  const queue = useQueue();
  const { state } = queue;
  const [sportId, setSportId] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  if (!state) return null;

  const sports = state.sports.filter((sport) => sport.enabled);
  const visibleSports = sportId === "all" ? sports : sports.filter((sport) => sport.id === sportId);

  function report(message: string | null, success: string) {
    setError(message);
    setNotice(message ? null : success);
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <PageHeader
        title="Staff dashboard"
        description="Call the next group, assign a court, and start or finish a game. These controls stay in this browser."
      />
      <p className="rounded-3xl bg-sand px-4 py-3 text-sm font-semibold leading-6 text-clay">
        This is a local prototype, not a secure staff login. Anyone using this browser can change the queue.
      </p>
      <ButtonLink href="/pairs" variant="secondary" full>
        Make pairs from a skill ranking
      </ButtonLink>
      <FilterChips
        label="Sport to manage"
        value={sportId}
        onChange={setSportId}
        options={[{ id: "all", label: "All sports" }, ...sports.map((sport) => ({ id: sport.id, label: sport.name }))]}
      />
      {error ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-2xl bg-lime px-4 py-3 text-sm font-bold text-pine">
          {notice}
        </p>
      ) : null}

      {sports.length === 0 ? <p className="text-base text-muted">All sports are turned off. Turn one on in Settings.</p> : null}

      {visibleSports.map((sport) => {
        const next = nextWaiting(state, sport.id);
        const playing = listByStatus(state, "playing", sport.id);
        const called = listByStatus(state, "called", sport.id);
        const waiting = listByStatus(state, "waiting", sport.id);
        return (
          <section key={sport.id} className="grid gap-3">
            <h2 className="text-xl font-extrabold text-pine">
              <span aria-hidden>{sport.icon} </span>
              {sport.name}
            </h2>
            <Button
              full
              disabled={!next}
              onClick={() => {
                if (!next) return;
                const name = entryTitle(next);
                report(queue.callNext(sport.id), `${name} is called. Choose a court, then start the game.`);
              }}
            >
              {next ? `Call ${entryTitle(next)}` : "Nobody is waiting"}
            </Button>
            <p className="text-sm text-muted">This calls the group that has been waiting the longest.</p>
            {playing.map((entry) => (
              <StaffCard
                key={entry.id}
                entry={entry}
                onConfirm={setConfirm}
                onAction={(message, success) => report(message, success)}
              />
            ))}
            {called.map((entry) => (
              <StaffCard
                key={entry.id}
                entry={entry}
                onConfirm={setConfirm}
                onAction={(message, success) => report(message, success)}
              />
            ))}
            {waiting.map((entry) => (
              <StaffCard
                key={entry.id}
                entry={entry}
                onConfirm={setConfirm}
                onAction={(message, success) => report(message, success)}
              />
            ))}
            {playing.length + called.length + waiting.length === 0 ? (
              <p className="text-base text-muted">Nobody is in the {sport.name} queue.</p>
            ) : null}
          </section>
        );
      })}

      <AddPlayerForm onDone={(message, success) => report(message, success)} />

      {confirm ? (
        <ConfirmDialog
          danger
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.action();
            setConfirm(null);
          }}
        />
      ) : null}
    </div>
  );
}

function StaffCard({
  entry,
  onConfirm,
  onAction,
}: {
  entry: QueueEntry;
  onConfirm: (confirm: ConfirmState) => void;
  onAction: (message: string | null, success: string) => void;
}) {
  const { state, assignCourt, startMatch, finishMatch, returnToQueue, skip, noShow, remove } = useQueue();
  const [courtId, setCourtId] = useState(entry.courtId ?? "");
  if (!state) return null;
  const sport = sportById(state, entry.sportId);
  const courts = assignableCourts(state, entry);
  const name = entryTitle(entry);

  return (
    <article className="grid gap-3 rounded-3xl bg-white p-4">
      <div>
        <p className="text-sm font-bold text-muted">{formatLabel(entry.format)} · {entry.status === "waiting" ? "Waiting" : entry.status === "called" ? "Called" : "Playing"}</p>
        <h3 className="break-words text-xl font-extrabold text-pine">{name}</h3>
        {entry.courtPreferenceId ? (
          <p className="mt-1 text-sm text-muted">Asked for {state.courts.find((court) => court.id === entry.courtPreferenceId)?.name ?? "a court"}</p>
        ) : (
          <p className="mt-1 text-sm text-muted">Any court</p>
        )}
      </div>

      {entry.status === "called" ? (
        <div className="grid gap-2">
          <label>
            <span className="text-sm font-bold">Court</span>
            <select className={cn(fieldClass, "mt-2")} value={courtId} onChange={(event) => setCourtId(event.target.value)}>
              <option value="">Choose a court</option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
          </label>
          {courts.length === 0 ? <p className="text-sm text-muted">No open court for {sport?.name ?? "this sport"}. Open one on the Courts page.</p> : null}
          <Button
            full
            onClick={() => {
              if (!courtId) {
                onAction("Choose a court from the list.", "");
                return;
              }
              onAction(assignCourt(entry.id, courtId), `${name} assigned to a court.`);
            }}
          >
            Assign court
          </Button>
          <Button full disabled={!entry.courtId} onClick={() => onAction(startMatch(entry.id), `${name} started.`)}>
            Start game
          </Button>
        </div>
      ) : null}

      {entry.status === "playing" ? (
        <Button full onClick={() => onAction(finishMatch(entry.id), `${name} finished. The court is open.`)}>
          Finish game
        </Button>
      ) : null}

      {entry.status === "called" || entry.status === "playing" ? (
        <Button variant="secondary" full onClick={() => onAction(returnToQueue(entry.id), `${name} is back in the queue.`)}>
          Send back to queue
        </Button>
      ) : null}

      {entry.status === "waiting" || entry.status === "called" ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              onConfirm({
                title: `Skip ${name}?`,
                body: "They leave this turn. The next waiting group can be called.",
                confirmLabel: "Skip",
                action: () => onAction(skip(entry.id), `${name} skipped.`),
              })
            }
          >
            Skip
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              onConfirm({
                title: `Mark ${name} as a no-show?`,
                body: "They will be removed from the live queue and kept in history.",
                confirmLabel: "No-show",
                action: () => onAction(noShow(entry.id), `${name} marked as a no-show.`),
              })
            }
          >
            No-show
          </Button>
        </div>
      ) : null}

      <Button
        variant="danger"
        full
        onClick={() =>
          onConfirm({
            title: `Remove ${name}?`,
            body: "They will leave the live queue. This is saved in match history as removed.",
            confirmLabel: "Remove",
            action: () => onAction(remove(entry.id), `${name} removed.`),
          })
        }
      >
        Remove
      </Button>
    </article>
  );
}

function AddPlayerForm({ onDone }: { onDone: (message: string | null, success: string) => void }) {
  const { state, staffAdd } = useQueue();
  const [sportId, setSportId] = useState(state?.sports.find((sport) => sport.enabled)?.id ?? "");
  const [format, setFormat] = useState<PlayFormat | "">("");
  const [displayName, setDisplayName] = useState("");
  const [teammate, setTeammate] = useState("");
  if (!state) return null;
  const sport = sportById(state, sportId);
  const formats = sport?.formats ?? [];

  return (
    <details className="rounded-3xl bg-white p-4">
      <summary className="cursor-pointer text-base font-extrabold text-pine">Add a player or team</summary>
      <p className="mt-2 text-sm leading-6 text-muted">
        People added here cannot leave the queue from the public screen. Remove them here if they cancel.
      </p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!sport || !format) {
            onDone("Choose a sport and a way to play.", "");
            return;
          }
          const message = staffAdd({
            sportId: sport.id,
            format,
            displayName,
            teammates: teammate.trim() ? [teammate] : [],
            courtPreferenceId: null,
          });
          onDone(message, `${displayName.trim()} added to ${sport.name}.`);
          if (!message) {
            setDisplayName("");
            setTeammate("");
          }
        }}
      >
        <label>
          <span className="text-sm font-bold">Sport</span>
          <select
            className={cn(fieldClass, "mt-2")}
            value={sportId}
            onChange={(event) => {
              setSportId(event.target.value);
              setFormat("");
            }}
          >
            {state.sports.filter((item) => item.enabled).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-2">
          {formats.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={format === item}
              onClick={() => setFormat(item)}
              className={cn(
                "min-h-14 rounded-2xl border-2 px-4 text-left",
                format === item ? "border-pine bg-lime/40" : "border-line bg-white",
              )}
            >
              <span className="block font-extrabold text-pine">{formatLabel(item)}</span>
              <span className="block text-sm text-muted">{formatHint(item)}</span>
            </button>
          ))}
        </div>
        <label>
          <span className="text-sm font-bold">{format === "team" ? "Team name" : "Name"}</span>
          <input className={cn(fieldClass, "mt-2")} value={displayName} maxLength={40} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        {format === "doubles" || format === "team" ? (
          <label>
            <span className="text-sm font-bold">{format === "doubles" ? "Partner (optional)" : "One player name (optional)"}</span>
            <input className={cn(fieldClass, "mt-2")} value={teammate} maxLength={40} onChange={(event) => setTeammate(event.target.value)} />
          </label>
        ) : null}
        <Button type="submit" full>
          Add to queue
        </Button>
      </form>
    </details>
  );
}
