"use client";

import { useMemo, useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader, SelectionCheck, SurfaceCard, selectionChipClass, selectionPanelClass } from "@/components/ui/bits";
import { SessionRosterPanel } from "@/components/session/SessionRosterPanel";
import { fieldClass, cn } from "@/lib/cn";
import { formatLabel, formatSessionHint } from "@/lib/labels";
import type { PlayFormat } from "@/lib/types";

const COURT_PRESETS = [2, 4, 6, 8] as const;
const STEPS = ["Set up", "Players", "Start"] as const;

export function SessionSetupWizard({
  onStarted,
  onReport,
}: {
  onStarted: (notice: string) => void;
  onReport: (error: string | null, notice: string) => void;
}) {
  const queue = useQueue();
  const { state, setVenue, startSession } = queue;
  const [step, setStep] = useState(0);
  const [venueName, setVenueName] = useState(state?.venue.name ?? "");
  const [courtCount, setCourtCount] = useState(4);
  const [format, setFormat] = useState<PlayFormat>("doubles");
  const [courtsChoicesOpen, setCourtsChoicesOpen] = useState(false);
  const [formatChoicesOpen, setFormatChoicesOpen] = useState(false);
  const [courtPickMode, setCourtPickMode] = useState<"preset" | "custom">("preset");
  const [draftCheckedIn, setDraftCheckedIn] = useState<Set<string>>(() => new Set());

  const courtsCustomSelected = courtPickMode === "custom";

  const checkedInCount = useMemo(() => {
    if (!state) return 0;
    return state.players.filter((player) => draftCheckedIn.has(player.id)).length;
  }, [state, draftCheckedIn]);

  if (!state) return null;

  const appState = state;
  const players = appState.players;

  function toggleDraft(playerId: string, checked: boolean) {
    setDraftCheckedIn((current) => {
      const next = new Set(current);
      if (checked) next.add(playerId);
      else next.delete(playerId);
      return next;
    });
  }

  function handleStartSession() {
    const trimmedVenue = venueName.trim();
    if (trimmedVenue && trimmedVenue !== appState.venue.name) {
      const venueError = setVenue(trimmedVenue);
      if (venueError) {
        onReport(venueError, "");
        return;
      }
    }
    const startError = startSession({
      courtCount,
      format,
      checkInPlayerIds: [...draftCheckedIn],
    });
    if (startError) {
      onReport(startError, "");
      return;
    }
    onStarted("Session is live — build the next game when you are ready.");
  }

  const minPlayers = format === "doubles" ? 4 : 2;
  const readyToStart = checkedInCount >= minPlayers;

  const bottomMessage =
    step === 0
      ? "Set courts and doubles as the default."
      : step === 1
        ? checkedInCount === 0
          ? "Add players and check them in for today."
          : `${checkedInCount} checked in${checkedInCount < minPlayers ? ` · need ${minPlayers} for ${format}` : ""}.`
        : readyToStart
          ? `${checkedInCount} players ready — start when the court is open.`
          : `Check in at least ${minPlayers} players to run ${format}.`;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4 pb-28 md:pb-8">
      <PageHeader
        eyebrow="New session"
        title="Pickleball today"
        description="Balanced doubles use star ratings to mix teams — not the same as win/loss rankings."
      />

      <ol className="flex gap-1 text-center text-xs font-bold" aria-label="Setup progress">
        {STEPS.map((label, index) => {
          const current = index === step;
          const done = index < step;
          return (
            <li key={label} className="flex-1">
              <div
                className={cn(
                  "rounded-full px-2 py-2",
                  current ? "bg-pine text-lime" : done ? "bg-lime/80 text-pine" : "bg-white text-muted",
                )}
              >
                <span className="block text-[10px] uppercase tracking-wide opacity-80">Step {index + 1}</span>
                {label}
              </div>
            </li>
          );
        })}
      </ol>

      {step === 0 ? (
        <SurfaceCard className="grid gap-4">
          <label className="block">
            <span className="text-sm font-bold text-pine">Session / venue name</span>
            <input
              className={cn(fieldClass, "mt-2")}
              value={venueName}
              maxLength={60}
              onChange={(event) => setVenueName(event.target.value)}
              placeholder="Riverside Courts"
            />
          </label>

          <details
            className="rounded-2xl border border-line/80 bg-foam/40 px-3 py-2"
            open={courtsChoicesOpen}
            onToggle={(event) => setCourtsChoicesOpen(event.currentTarget.open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-bold text-muted">Courts</span>
              <span className="text-sm font-extrabold text-pine">
                {courtCount} {courtCount === 1 ? "court" : "courts"}
                {courtsCustomSelected ? " · custom" : ""}
              </span>
            </summary>
            <div className="mt-3 grid gap-3 border-t border-line/60 pt-3">
              <div className="flex flex-wrap gap-2">
                {COURT_PRESETS.map((preset) => {
                  const selected = courtPickMode === "preset" && courtCount === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setCourtPickMode("preset");
                        setCourtCount(preset);
                      }}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold",
                        selectionChipClass(selected),
                      )}
                    >
                      <SelectionCheck selected={selected} size="sm" />
                      {preset}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={courtsCustomSelected}
                  onClick={() => setCourtPickMode("custom")}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold",
                    selectionChipClass(courtsCustomSelected),
                  )}
                >
                  <SelectionCheck selected={courtsCustomSelected} size="sm" />
                  Custom
                </button>
              </div>
              {courtsCustomSelected ? (
                <label className="block">
                  <span className="text-sm font-bold text-muted">Courts (1–24)</span>
                  <input
                    className={cn(fieldClass, "mt-2")}
                    type="number"
                    min={1}
                    max={24}
                    value={courtCount}
                    onChange={(event) => setCourtCount(Number(event.target.value))}
                  />
                </label>
              ) : null}
            </div>
          </details>

          <details
            className="rounded-2xl border border-line/80 bg-foam/40 px-3 py-2"
            open={formatChoicesOpen}
            onToggle={(event) => setFormatChoicesOpen(event.currentTarget.open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-bold text-muted">Format</span>
              <span className="text-sm font-extrabold text-pine">{formatLabel(format)}</span>
            </summary>
            <div className="mt-3 grid gap-2 border-t border-line/60 pt-3">
              {(["doubles", "singles"] as PlayFormat[]).map((item) => {
                const selected = format === item;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFormat(item)}
                    className={cn(
                      "flex min-h-14 items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left",
                      selectionPanelClass(selected),
                    )}
                  >
                    <SelectionCheck selected={selected} className="mt-0.5" />
                    <span>
                      <span className="block font-extrabold text-pine">{formatLabel(item)}</span>
                      <span className="block text-sm text-muted">{formatSessionHint(item)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </details>

          <p className="text-sm text-muted">
            <span className="font-bold text-pine">{courtCount} courts</span> · {formatLabel(format)} · saved on this device only
          </p>
        </SurfaceCard>
      ) : null}

      {step === 1 ? (
        <SurfaceCard>
          <h2 className="text-lg font-extrabold text-pine">Roster &amp; check-in</h2>
          <p className="mt-1 text-sm text-muted">Everyone checked in here joins today&apos;s rotation.</p>
          <div className="mt-4">
            <SessionRosterPanel
              mode="setup"
              draftCheckedIn={draftCheckedIn}
              onDraftToggle={toggleDraft}
              onReport={onReport}
            />
          </div>
          {players.length > 0 ? (
            <Button
              variant="secondary"
              full
              className="mt-3"
              onClick={() => {
                setDraftCheckedIn(new Set(players.map((player) => player.id)));
                onReport(null, "All players marked checked in.");
              }}
            >
              Check in all ({players.length})
            </Button>
          ) : null}
        </SurfaceCard>
      ) : null}

      {step === 2 ? (
        <SurfaceCard className="grid gap-3">
          <h2 className="text-lg font-extrabold text-pine">Ready to open courts?</h2>
          <ul className="grid gap-2 text-sm text-muted">
            <li>
              <span className="font-bold text-pine">{venueName.trim() || appState.venue.name}</span> · {courtCount} courts ·{" "}
              {formatLabel(format)}
            </li>
            <li>
              <span className="font-bold text-pine">{checkedInCount}</span> players checked in
            </li>
            <li>Star ratings guide balanced teams; rankings update when you record winners.</li>
          </ul>
          {!readyToStart ? (
            <p className="rounded-2xl bg-sand px-3 py-2 text-sm text-clay">
              You can start now and add more players later, but you need at least {minPlayers} checked in to build{" "}
              {format}.
            </p>
          ) : null}
        </SurfaceCard>
      ) : null}

      <div
        className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:static md:rounded-3xl md:border md:shadow-sm"
        role="region"
        aria-label="Next step"
      >
        <p className="text-center text-sm font-semibold text-pine">{bottomMessage}</p>
        <div className={cn("mt-2 grid gap-2", step === 0 ? "grid-cols-1" : "grid-cols-2")}>
          {step > 0 ? (
            <Button variant="secondary" full onClick={() => setStep((value) => value - 1)}>
              Back
            </Button>
          ) : null}
          {step < 2 ? (
            <Button full onClick={() => setStep((value) => value + 1)}>
              {step === 0 ? "Continue to players" : "Review & start"}
            </Button>
          ) : (
            <Button full className={step > 0 ? "col-span-2" : ""} onClick={handleStartSession}>
              Start session ({checkedInCount} in)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
