"use client";

import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/bits";
import { fieldClass, cn } from "@/lib/cn";
import { formatLabel } from "@/lib/labels";
import { manageableSports } from "@/lib/sports";
import type { PlayFormat, Sport, SportDraft } from "@/lib/types";
import { PLAY_FORMATS } from "@/lib/types";

type ConfirmState = {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  action: () => void;
};

export function SettingsPanel() {
  const queue = useQueue();
  const { state, setVenue, setSportEnabled, removeSport, restore, reset } = queue;
  const [venueName, setVenueName] = useState(state?.venue.name ?? "");
  const [venueSource, setVenueSource] = useState(state?.venue.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  if (!state) return null;
  if (venueSource !== state.venue.name) {
    setVenueSource(state.venue.name);
    setVenueName(state.venue.name);
  }

  function report(message: string | null, success: string) {
    setError(message);
    setNotice(message ? null : success);
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <PageHeader title="Settings" description="Venue name, sports, and a backup of this browser." />
      <section className="rounded-3xl bg-pine p-4 text-white">
        <h2 className="text-lg font-extrabold">This browser only</h2>
        <p className="mt-2 text-sm leading-6 text-lime">
          SportQueue keeps the queue in this browser. Closing the page does not erase it. Opening SportQueue on another device starts a separate queue. Nothing is sent to a server, and there is no shared login.
        </p>
      </section>

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

      <form
        className="grid gap-3 rounded-3xl bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          report(setVenue(venueName), "Venue name saved.");
        }}
      >
        <h2 className="text-lg font-extrabold text-pine">Venue</h2>
        <label>
          <span className="text-sm font-bold">Name players will see</span>
          <input
            id="venue-name"
            className={cn(fieldClass, "mt-2")}
            value={venueName}
            maxLength={60}
            onChange={(event) => setVenueName(event.target.value)}
          />
        </label>
        <Button type="submit">Save venue</Button>
      </form>

      <section className="grid gap-3">
        <h2 className="text-lg font-extrabold text-pine">Sports</h2>
        <p className="text-sm text-muted">Court sessions use pickleball. Other sports here only matter for legacy history or custom venues.</p>
        <ul className="grid gap-3">
          {manageableSports(state.sports).map((sport) => (
            <li key={sport.id} className="rounded-3xl bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-extrabold text-pine">
                    <span aria-hidden>{sport.icon} </span>
                    {sport.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {sport.formats.map((format) => formatLabel(format)).join(", ")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sport.enabled}
                  aria-label={`${sport.name} is ${sport.enabled ? "on" : "off"}`}
                  onClick={() => report(setSportEnabled(sport.id, !sport.enabled), sport.enabled ? `${sport.name} turned off.` : `${sport.name} turned on.`)}
                  className="flex min-h-12 items-center gap-2"
                >
                  <span className={cn("relative h-8 w-14 rounded-full", sport.enabled ? "bg-pine" : "bg-line")}>
                    <span className={cn("absolute top-1 h-6 w-6 rounded-full bg-white", sport.enabled ? "left-7" : "left-1")} />
                  </span>
                </button>
              </div>
              <SportEditor sport={sport} onDone={(message, success) => report(message, success)} />
              <Button
                variant="danger"
                full
                className="mt-3"
                onClick={() =>
                  setConfirm({
                    title: `Remove ${sport.name}?`,
                    body: "You can remove a sport only when nobody is waiting or playing it. Past games stay in history.",
                    confirmLabel: "Remove sport",
                    danger: true,
                    action: () => report(removeSport(sport.id), `${sport.name} removed.`),
                  })
                }
              >
                Remove sport
              </Button>
            </li>
          ))}
        </ul>
        <AddSportForm onDone={(message, success) => report(message, success)} />
      </section>

      <section className="grid gap-3 rounded-3xl bg-white p-4">
        <h2 className="text-lg font-extrabold text-pine">Backup in this browser</h2>
        <p className="text-sm leading-6 text-muted">
          Export downloads a file. It is not uploaded. Restore replaces the queue, player list, sports, courts, and history currently saved in this browser.
        </p>
        <Button
          full
          onClick={() => {
            const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `sportqueue-backup-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(url);
            setNotice("Backup file downloaded.");
            setError(null);
          }}
        >
          Export backup
        </Button>
        <label className={buttonClasses("secondary", true)}>
          Choose a backup file
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                const parsed = JSON.parse(await file.text()) as unknown;
                setConfirm({
                  title: "Replace this browser's queue?",
                  body: "The backup will replace players, courts, sports, and history in this browser.",
                  confirmLabel: "Restore backup",
                  action: () => report(restore(parsed), "Backup restored."),
                });
              } catch {
                setError("That file could not be read.");
                setNotice(null);
              }
            }}
          />
        </label>
      </section>

      <section className="rounded-3xl bg-white p-4">
        <h2 className="text-lg font-extrabold text-pine">Sample data</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Put back the sample venue, players, and courts. This replaces what is currently saved in this browser.
        </p>
        <Button
          variant="danger"
          full
          className="mt-3"
          onClick={() =>
            setConfirm({
              title: "Reset sample data?",
              body: "The queue in this browser will be replaced with the sample players and courts.",
              confirmLabel: "Reset sample data",
              danger: true,
              action: () => {
                reset();
                setError(null);
                setNotice("Sample data restored.");
              },
            })
          }
        >
          Reset sample data
        </Button>
      </section>

      {confirm ? (
        <ConfirmDialog
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
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

function SportEditor({ sport, onDone }: { sport: Sport; onDone: (message: string | null, success: string) => void }) {
  const { updateSport } = useQueue();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SportDraft>(() => draftFromSport(sport));
  if (!open) {
    return (
      <Button variant="secondary" full className="mt-3" onClick={() => setOpen(true)}>
        Edit sport
      </Button>
    );
  }
  return (
    <form
      className="mt-3 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const message = updateSport(sport.id, draft);
        onDone(message, `${draft.name.trim() || sport.name} saved.`);
        if (!message) setOpen(false);
      }}
    >
      <SportFields draft={draft} onChange={setDraft} />
      <Button type="submit" full>
        Save sport
      </Button>
      <Button variant="secondary" full onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}

function AddSportForm({ onDone }: { onDone: (message: string | null, success: string) => void }) {
  const { addSport } = useQueue();
  const [draft, setDraft] = useState<SportDraft>({
    name: "",
    icon: "🏅",
    formats: ["singles"],
    defaultMatchMinutes: 30,
    defaultGroupSize: { singles: 1, doubles: 2, team: 4 },
  });
  return (
    <details className="rounded-3xl bg-white p-4">
      <summary className="cursor-pointer text-base font-extrabold text-pine">Add a sport</summary>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const message = addSport(draft);
          onDone(message, `${draft.name.trim()} added.`);
          if (!message) {
            setDraft({
              name: "",
              icon: "🏅",
              formats: ["singles"],
              defaultMatchMinutes: 30,
              defaultGroupSize: { singles: 1, doubles: 2, team: 4 },
            });
          }
        }}
      >
        <SportFields draft={draft} onChange={setDraft} />
        <Button type="submit" full>
          Add sport
        </Button>
      </form>
    </details>
  );
}

function SportFields({ draft, onChange }: { draft: SportDraft; onChange: (draft: SportDraft) => void }) {
  return (
    <>
      <label className="block">
        <span className="text-sm font-bold">Name</span>
        <input className={cn(fieldClass, "mt-2")} value={draft.name} maxLength={40} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
      </label>
      <label className="block">
        <span className="text-sm font-bold">Symbol</span>
        <input className={cn(fieldClass, "mt-2")} value={draft.icon} maxLength={8} onChange={(event) => onChange({ ...draft, icon: event.target.value })} />
      </label>
      <label className="block">
        <span className="text-sm font-bold">Usual match length in minutes</span>
        <input
          className={cn(fieldClass, "mt-2")}
          inputMode="numeric"
          type="number"
          min={5}
          max={240}
          value={draft.defaultMatchMinutes}
          onChange={(event) => onChange({ ...draft, defaultMatchMinutes: Number(event.target.value) })}
        />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-bold">Ways to play</legend>
        {PLAY_FORMATS.map((format) => {
          const checked = draft.formats.includes(format);
          return (
            <label key={format} className="flex min-h-12 items-center gap-3 text-base font-semibold">
              <input
                type="checkbox"
                className="h-5 w-5 accent-pine"
                checked={checked}
                onChange={() => {
                  const formats = checked ? draft.formats.filter((item) => item !== format) : [...draft.formats, format];
                  onChange({ ...draft, formats });
                }}
              />
              {formatLabel(format)}
            </label>
          );
        })}
      </fieldset>
      {draft.formats.map((format) => (
        <label key={format} className="block">
          <span className="text-sm font-bold">Usual {formatLabel(format).toLowerCase()} size</span>
          <input
            className={cn(fieldClass, "mt-2")}
            inputMode="numeric"
            type="number"
            min={1}
            max={20}
            value={draft.defaultGroupSize[format] ?? defaultSize(format)}
            onChange={(event) =>
              onChange({
                ...draft,
                defaultGroupSize: { ...draft.defaultGroupSize, [format]: Number(event.target.value) },
              })
            }
          />
        </label>
      ))}
    </>
  );
}

function draftFromSport(sport: Sport): SportDraft {
  return {
    name: sport.name,
    icon: sport.icon,
    formats: sport.formats,
    defaultMatchMinutes: sport.defaultMatchMinutes,
    defaultGroupSize: sport.defaultGroupSize,
  };
}

function defaultSize(format: PlayFormat): number {
  if (format === "singles") return 1;
  if (format === "doubles") return 2;
  return 4;
}
