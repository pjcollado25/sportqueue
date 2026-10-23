"use client";

import { ButtonLink } from "@/components/ui/Button";
import { useQueue } from "@/components/providers/QueueProvider";
import { aheadLabel, entryTitle, formatLabel, formatTime, placeLabel } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { countOpenCourts, countPlaying, countWaiting, courtName, myActiveEntries, queuePosition, recentFinished, sportName } from "@/lib/selectors";

export function HomeDashboard() {
  const { state, playerToken } = useQueue();
  if (!state) return null;

  const mine = myActiveEntries(state, playerToken);
  const lead = mine[0];
  const waiting = countWaiting(state);
  const playing = countPlaying(state);
  const openCourts = countOpenCourts(state);
  const recent = recentFinished(state, 3);
  const sports = state.sports.filter((sport) => sport.enabled);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-muted">One queue. Every sport.</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-pine">Welcome</h1>
        <p className="mt-1 text-base text-muted">You&apos;re at {state.venue.name}.</p>
      </header>

      {lead ? (
        <section className={cn("rounded-3xl p-4", lead.status === "waiting" ? "bg-lime text-pine" : "bg-pine text-white")}>
          <p className="text-sm font-bold">
            {sportName(state, lead.sportId)} · {formatLabel(lead.format)}
          </p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight">
            {lead.status === "playing" ? "You're playing" : lead.status === "called" ? "You're up" : placeLabel(queuePosition(state, lead.id) ?? 1)}
          </h2>
          <p className="mt-1 text-base leading-6">
            {lead.status === "waiting" ? aheadLabel(queuePosition(state, lead.id) ?? 1) : null}
            {lead.status === "called"
              ? courtName(state, lead.courtId)
                ? `Go to ${courtName(state, lead.courtId)}.`
                : "Staff will point you to a court."
              : null}
            {lead.status === "playing"
              ? courtName(state, lead.courtId)
                ? `You are on ${courtName(state, lead.courtId)}.`
                : "Your game is underway."
              : null}
          </p>
          {mine.length > 1 ? <p className="mt-2 text-sm font-semibold">You also have another spot in a queue.</p> : null}
          <ButtonLink href="/queue" variant={lead.status === "waiting" ? "secondary" : "primary"} full className="mt-4">
            See the live queue
          </ButtonLink>
        </section>
      ) : null}

      <div className="grid gap-2">
        <ButtonLink href="/join" full>
          Join queue
        </ButtonLink>
        <ButtonLink href="/pairs" variant="secondary" full>
          Make pairs
        </ButtonLink>
        <ButtonLink href="/staff" variant="secondary" full>
          Staff dashboard
        </ButtonLink>
      </div>

      <section aria-label="Today at a glance" className="grid grid-cols-3 overflow-hidden rounded-3xl bg-line">
        <Stat value={waiting} label="Waiting" />
        <Stat value={playing} label="Playing" />
        <Stat value={openCourts} label="Open courts" />
      </section>

      <section>
        <h2 className="text-lg font-extrabold text-pine">Choose a sport</h2>
        {sports.length === 0 ? (
          <p className="mt-2 text-base text-muted">All sports are turned off. Turn one on in Settings.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sports.map((sport) => {
              const inQueue = mine.some((entry) => entry.sportId === sport.id);
              return (
                <a
                  key={sport.id}
                  href={`/join?sport=${sport.id}`}
                  className="flex min-h-28 flex-col justify-between rounded-3xl bg-white p-4 text-left shadow-sm active:bg-lime/40"
                >
                  <span className="text-3xl" aria-hidden>
                    {sport.icon}
                  </span>
                  <span>
                    <span className="block text-base font-extrabold text-pine">{sport.name}</span>
                    {inQueue ? <span className="text-xs font-bold text-pine">In queue</span> : null}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-pine">Finished recently</h2>
          <a href="/history" className="text-sm font-bold text-pine underline">
            History
          </a>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-3xl bg-white px-4 py-6 text-base text-muted">No finished games yet.</p>
        ) : (
          <ul className="grid gap-2">
            {recent.map((entry) => (
              <li key={entry.id} className="rounded-3xl bg-white px-4 py-3">
                <p className="text-sm font-bold text-muted">
                  {sportName(state, entry.sportId)} · {formatTime(entry.endedAt)}
                </p>
                <p className="text-base font-extrabold text-pine">{entryTitle(entry)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white px-2 py-3 text-center">
      <p className="text-2xl font-extrabold tabular-nums text-pine">{value}</p>
      <p className="mt-1 text-sm font-semibold leading-tight text-muted">{label}</p>
    </div>
  );
}
