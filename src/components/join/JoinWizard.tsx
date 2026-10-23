"use client";

import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { aheadLabel, formatHint, formatLabel, placeLabel } from "@/lib/labels";
import { fieldClass, cn } from "@/lib/cn";
import { courtSupportsSport, queuePosition, sportName } from "@/lib/selectors";
import type { PlayFormat } from "@/lib/types";
import { isActiveStatus } from "@/lib/types";

type StepId = "sport" | "format" | "name" | "teammates" | "court" | "summary";

function visibleSteps(format: PlayFormat | null): StepId[] {
  const steps: StepId[] = ["sport", "format", "name"];
  if (format === "doubles" || format === "team") steps.push("teammates");
  steps.push("court", "summary");
  return steps;
}

export function JoinWizard() {
  const params = useSearchParams();
  const { state, playerToken, join } = useQueue();
  const requested = params.get("sport");
  const initialSport = state?.sports.find((sport) => sport.id === requested && sport.enabled)?.id ?? null;

  const [sportId, setSportId] = useState<string | null>(initialSport);
  const [format, setFormat] = useState<PlayFormat | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [partner, setPartner] = useState("");
  const [teamPlayers, setTeamPlayers] = useState<string[]>([""]);
  const [courtPreferenceId, setCourtPreferenceId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [joinedId, setJoinedId] = useState<string | null>(null);

  if (!state || !playerToken) return null;

  const sport = state.sports.find((item) => item.id === sportId) ?? null;
  const steps = visibleSteps(format);
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeIndex] ?? "sport";
  const already =
    sport !== null &&
    state.entries.some(
      (entry) => entry.ownerToken === playerToken && entry.sportId === sport.id && isActiveStatus(entry.status),
    );

  if (joinedId) {
    const entry = state.entries.find((item) => item.id === joinedId);
    const position = entry ? queuePosition(state, entry.id) : null;
    return (
      <div className="mx-auto grid w-full max-w-lg gap-4 pb-28 md:pb-0">
        <section className="rounded-3xl bg-lime p-5 text-pine">
          <p className="text-sm font-bold">You&apos;re in the queue</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight">{position ? placeLabel(position) : "You're in"}</h1>
          <p className="mt-2 text-base leading-6">
            {entry ? `${entry.displayName} · ${sportName(state, entry.sportId)} · ${formatLabel(entry.format)}` : "Your spot is saved on this phone."}
          </p>
          {position ? <p className="mt-2 text-base font-semibold">{aheadLabel(position)}</p> : null}
        </section>
        <ButtonLink href="/queue" full>
          See the live queue
        </ButtonLink>
      </div>
    );
  }

  function advance() {
    if (step === "sport" && !sport) {
      setError("Choose a sport.");
      return;
    }
    if (step === "sport" && already) {
      setError("You are already in this sport's queue. Check Live queue for your place.");
      return;
    }
    if (step === "format" && !format) {
      setError("Choose singles, doubles, or a team.");
      return;
    }
    if (step === "name" && displayName.trim().length < 1) {
      setError(format === "team" ? "Enter a team name." : "Enter a name so staff know who to call.");
      return;
    }
    if (step === "name" && displayName.trim().length > 40) {
      setError("Use 40 characters or fewer.");
      return;
    }
    setError(null);
    setStepIndex((index) => index + 1);
  }

  function submitJoin() {
    if (!sport || !format) return;
    const teammates = format === "doubles" ? [partner] : format === "team" ? teamPlayers : [];
    const result = join({
      sportId: sport.id,
      format,
      displayName,
      teammates,
      courtPreferenceId,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setJoinedId(result.entryId);
  }

  const courts = sport
    ? state.courts.filter((court) => !court.closed && courtSupportsSport(court, sport.id))
    : [];

  return (
    <form
      className="mx-auto grid w-full max-w-lg gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "summary") submitJoin();
        else advance();
      }}
    >
      <div className="pb-28 md:pb-0">
        <p className="text-sm font-bold text-muted">
          Step {safeIndex + 1} of {steps.length}
        </p>
        <div className="mt-2 flex gap-1" aria-hidden>
          {steps.map((item, index) => (
            <span key={item} className={cn("h-1.5 flex-1 rounded-full", index <= safeIndex ? "bg-pine" : "bg-line")} />
          ))}
        </div>

        {safeIndex > 0 ? (
          <button
            type="button"
            className="mt-4 inline-flex min-h-11 items-center gap-1 text-base font-bold text-pine"
            onClick={() => {
              setError(null);
              setStepIndex((index) => Math.max(0, index - 1));
            }}
          >
            <ChevronLeft aria-hidden size={20} />
            Back
          </button>
        ) : null}

        {step === "sport" ? (
          <section className="mt-3">
            <h1 className="text-2xl font-extrabold text-pine">Choose a sport</h1>
            <p className="mt-1 text-base text-muted">Tap the game you want to play.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {state.sports.filter((item) => item.enabled).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={sportId === item.id}
                  onClick={() => {
                    setSportId(item.id);
                    setFormat(null);
                    setCourtPreferenceId(null);
                    setError(null);
                  }}
                  className={cn(
                    "flex min-h-28 flex-col items-start justify-between rounded-3xl border-2 bg-white p-4 text-left",
                    sportId === item.id ? "border-pine bg-lime/40" : "border-transparent",
                  )}
                >
                  <span className="text-3xl" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="text-base font-extrabold text-pine">{item.name}</span>
                </button>
              ))}
            </div>
            {state.sports.every((item) => !item.enabled) ? (
              <p className="mt-4 text-base text-muted">All sports are turned off. Ask staff to turn one on in Settings.</p>
            ) : null}
          </section>
        ) : null}

        {step === "format" && sport ? (
          <section className="mt-3">
            <h1 className="text-2xl font-extrabold text-pine">How are you playing?</h1>
            <p className="mt-1 text-base text-muted">{sport.name}</p>
            <div className="mt-4 grid gap-3">
              {sport.formats.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={format === item}
                  onClick={() => {
                    setFormat(item);
                    setError(null);
                  }}
                  className={cn(
                    "min-h-20 rounded-3xl border-2 bg-white px-4 py-3 text-left",
                    format === item ? "border-pine bg-lime/40" : "border-transparent",
                  )}
                >
                  <span className="block text-lg font-extrabold text-pine">{formatLabel(item)}</span>
                  <span className="block text-sm text-muted">{formatHint(item)}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === "name" ? (
          <section className="mt-3">
            <h1 className="text-2xl font-extrabold text-pine">{format === "team" ? "Team name" : "Your name"}</h1>
            <p className="mt-1 text-base text-muted">This is the name staff will call.</p>
            <label className="mt-4 block">
              <span className="text-sm font-bold">{format === "team" ? "Team name" : "Your name"}</span>
              <input
                className={cn(fieldClass, "mt-2")}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={40}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                required
              />
            </label>
          </section>
        ) : null}

        {step === "teammates" && format === "doubles" ? (
          <section className="mt-3">
            <h1 className="text-2xl font-extrabold text-pine">Partner&apos;s name</h1>
            <p className="mt-1 text-base text-muted">Optional. You can join now and add a partner later.</p>
            <label className="mt-4 block">
              <span className="text-sm font-bold">Partner&apos;s name</span>
              <input
                className={cn(fieldClass, "mt-2")}
                value={partner}
                onChange={(event) => setPartner(event.target.value)}
                maxLength={40}
                autoCapitalize="words"
                enterKeyHint="next"
              />
            </label>
          </section>
        ) : null}

        {step === "teammates" && format === "team" ? (
          <section className="mt-3">
            <h1 className="text-2xl font-extrabold text-pine">Player names</h1>
            <p className="mt-1 text-base text-muted">Optional. Add the people on {displayName.trim() || "the team"}.</p>
            <div className="mt-4 grid gap-3">
              {teamPlayers.map((player, index) => (
                <div key={index} className="flex items-center gap-2">
                  <label className="block min-w-0 flex-1">
                    <span className="sr-only">Player {index + 1}</span>
                    <input
                      className={fieldClass}
                      value={player}
                      maxLength={40}
                      autoCapitalize="words"
                      placeholder={`Player ${index + 1}`}
                      onChange={(event) => {
                        const next = [...teamPlayers];
                        next[index] = event.target.value;
                        setTeamPlayers(next);
                      }}
                    />
                  </label>
                  {teamPlayers.length > 1 ? (
                    <button
                      type="button"
                      className="min-h-14 min-w-14 rounded-2xl bg-white text-sm font-bold text-danger"
                      onClick={() => setTeamPlayers(teamPlayers.filter((_, item) => item !== index))}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              {teamPlayers.length < 10 ? (
                <button
                  type="button"
                  className="min-h-12 text-left text-base font-bold text-pine"
                  onClick={() => setTeamPlayers([...teamPlayers, ""])}
                >
                  Add another player
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {step === "court" && sport ? (
          <section className="mt-3">
            <h1 className="text-2xl font-extrabold text-pine">Court preference</h1>
            <p className="mt-1 text-base text-muted">Any open court is usually the fastest.</p>
            <div className="mt-4 grid gap-2">
              <CourtChoice
                name="Any open court"
                detail="Staff picks the next free court"
                checked={courtPreferenceId === null}
                onSelect={() => setCourtPreferenceId(null)}
              />
              {courts.map((court) => (
                <CourtChoice
                  key={court.id}
                  name={court.name}
                  detail="Wait for this court if you can"
                  checked={courtPreferenceId === court.id}
                  onSelect={() => setCourtPreferenceId(court.id)}
                />
              ))}
            </div>
            {courts.length === 0 ? (
              <p className="mt-3 text-base text-muted">No courts are set up for {sport.name} yet. You can still join.</p>
            ) : null}
          </section>
        ) : null}

        {step === "summary" && sport && format ? (
          <section className="mt-3">
            <h1 className="text-2xl font-extrabold text-pine">Check this, then join</h1>
            <dl className="mt-4 grid gap-3 rounded-3xl bg-white p-4">
              <SummaryRow label="Sport" value={`${sport.icon} ${sport.name}`} />
              <SummaryRow label="Play" value={formatLabel(format)} />
              <SummaryRow label={format === "team" ? "Team" : "Name"} value={displayName.trim()} />
              {format === "doubles" ? <SummaryRow label="Partner" value={partner.trim() || "Not added"} /> : null}
              {format === "team" ? (
                <SummaryRow
                  label="Players"
                  value={teamPlayers.map((player) => player.trim()).filter(Boolean).join(", ") || "Not added"}
                />
              ) : null}
              <SummaryRow
                label="Court"
                value={courtPreferenceId ? (state.courts.find((court) => court.id === courtPreferenceId)?.name ?? "Any open court") : "Any open court"}
              />
            </dl>
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 z-20 border-t border-line bg-white/95 p-4 backdrop-blur md:static md:mt-2 md:border-0 md:bg-transparent md:p-0" style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}>
        {error ? (
          <p role="alert" className="mb-2 text-sm font-bold text-danger">
            {error}
          </p>
        ) : null}
        <div className="mx-auto max-w-lg">
          <Button type="submit" full>
            {step === "summary" ? "Join queue" : "Continue"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function CourtChoice({
  name,
  detail,
  checked,
  onSelect,
}: {
  name: string;
  detail: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-white px-4",
        checked ? "border-pine bg-lime/40" : "border-transparent",
      )}
    >
      <input type="radio" name="court" className="h-5 w-5 accent-pine" checked={checked} onChange={onSelect} />
      <span>
        <span className="block text-base font-extrabold text-pine">{name}</span>
        <span className="block text-sm text-muted">{detail}</span>
      </span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-bold text-muted">{label}</dt>
      <dd className="text-base font-extrabold text-pine">{value}</dd>
    </div>
  );
}
