"use client";

import { useState } from "react";
import { SessionSetupWizard } from "@/components/session/SessionSetupWizard";
import { SessionRosterPanel } from "@/components/session/SessionRosterPanel";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  InfoBanner,
  PageHeader,
  PipelineStep,
  SectionBlock,
  StatTile,
  SurfaceCard,
} from "@/components/ui/bits";
import { entryTitle, formatLabel, formatTime } from "@/lib/labels";
import { pairLine } from "@/lib/pairing";
import { CourtLiveCard } from "@/components/session/CourtLiveCard";
import {
  availableToPlay,
  checkedInPlayers,
  sessionCourts,
  sessionLabel,
  sessionOpenCourts,
  sessionWaiting,
} from "@/lib/session-selectors";
import type { QueueEntry } from "@/lib/types";

export function SessionHub() {
  const queue = useQueue();
  const { state } = queue;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  if (!state) return null;

  function report(message: string | null, success: string) {
    setError(message);
    setNotice(message ? null : success);
  }

  if (!state.playSession) {
    return (
      <>
        {error ? <Alert error={error} /> : null}
        {notice ? <Notice text={notice} /> : null}
        <SessionSetupWizard onReport={report} onStarted={(text) => report(null, text)} />
      </>
    );
  }

  const session = state.playSession;
  const sportId = session.sportId;
  const waiting = sessionWaiting(state);
  const called = state.entries.filter((e) => e.sportId === sportId && e.status === "called");
  const calledUnassigned = called.filter((e) => !e.courtId);
  const playing = state.entries.filter((e) => e.sportId === sportId && e.status === "playing");
  const checkedInList = checkedInPlayers(state);
  const checkedIn = checkedInList.length;
  const available = availableToPlay(state).length;
  const onCourt = checkedInList.filter((p) =>
    state.entries.some(
      (e) =>
        e.sportId === sportId &&
        (e.status === "playing" || e.status === "called") &&
        e.players.some((name) => name.toLowerCase() === p.name.toLowerCase()),
    ),
  ).length;
  const courts = sessionCourts(state);
  const staged = session.staged;
  const startedLabel = formatTime(session.startedAt) || "Today";

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageHeader eyebrow={`${state.venue.name} · Started ${startedLabel}`} title={sessionLabel(state)} />
        </div>
        <Button variant="secondary" onClick={() => setConfirmEnd(true)}>
          End session
        </Button>
      </header>

      {error ? <Alert error={error} /> : null}
      {notice ? <Notice text={notice} /> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Checked in" value={checkedIn} detail={`${available} ready for next game`} />
        <StatTile label="Up next" value={waiting.length} detail="Waiting to be called" />
        <StatTile label="On deck" value={called.length} detail="Assigned or called" />
        <StatTile label="On court" value={playing.length} detail={`${sessionOpenCourts(state)} courts open`} />
      </div>

      <div className="flex gap-1.5" aria-label="Session flow">
        <PipelineStep label="Ready" count={available} active={available >= 4 && session.format === "doubles"} />
        <PipelineStep label="Up next" count={waiting.length} active={waiting.length > 0} />
        <PipelineStep label="Called" count={called.length} active={called.length > 0} />
        <PipelineStep label="Playing" count={playing.length} active={playing.length > 0} />
      </div>

      <SectionBlock
        title="Live courts"
        description="Each court runs the full flow: call from Up Next, start play, record the winner and optional score."
        count={courts.length}
      >
        <div className="grid gap-3">
          {courts.map((court) => (
            <CourtLiveCard
              key={court.id}
              court={court}
              sportId={sportId}
              calledUnassigned={calledUnassigned}
              onReport={report}
            />
          ))}
        </div>
        {calledUnassigned.length > 0 ? (
          <p className="text-sm text-muted">
            <span className="font-bold text-pine">{calledUnassigned.length}</span> on deck without a court — tap an open court
            above or use Up Next below.
          </p>
        ) : null}
      </SectionBlock>

      <SectionBlock
        title="Checked in & waiting"
        description="Play levels (stars) balance teams. Rankings update when you record winners."
        count={checkedIn}
      >
        <SessionRosterPanel mode="live" variant="compact" onReport={report} showBulkImport={false} />
      </SectionBlock>

      {available < 4 && session.format === "doubles" ? (
        <InfoBanner title="Need more players" tone="warm">
          Check in at least four available players below to build doubles.
          {onCourt > 0 ? ` · ${onCourt} already on court or called` : null}
        </InfoBanner>
      ) : null}

      {session.format === "doubles" ? (
        <SectionBlock
          title="Build next game"
          description="Teams are balanced by play level (stars). Review before anything hits the queue."
        >
          <SurfaceCard className="!p-0 overflow-hidden">
            <div className="border-b border-line bg-foam/80 px-4 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Staff review</p>
            </div>
            <div className="p-4">
              {!staged ? (
                <div className="grid gap-3">
                  <p className="text-sm text-muted">
                    {available >= 4
                      ? `${available} players are checked in and free.`
                      : `Only ${available} available — check in more players first.`}
                  </p>
                  <Button full disabled={available < 4} onClick={() => report(queue.generateStaged(), "Teams ready for review.")}>
                    Generate balanced doubles
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TeamCard label="Side A" players={staged.sideA} />
                    <TeamCard label="Side B" players={staged.sideB} />
                  </div>
                  {staged.sittingOut ? (
                    <p className="rounded-2xl bg-sand/80 px-3 py-2 text-sm text-clay">
                      <span className="font-bold">Sits out:</span> {staged.sittingOut}{" "}
                      <span className="text-muted">(lowest skill among available)</span>
                    </p>
                  ) : null}
                  {staged.waitingPair ? (
                    <p className="text-sm font-semibold text-pine">
                      Pair waiting in queue: {pairLine(staged.waitingPair)}
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => report(queue.regenerateStaged(), "New teams generated.")}>
                      Regenerate
                    </Button>
                    <Button variant="secondary" onClick={() => report(queue.clearStaged(), "Proposal cleared.")}>
                      Clear
                    </Button>
                  </div>
                  <Button full onClick={() => report(queue.sendStagedToQueue(), "Game added to Up Next.")}>
                    Send to Up Next
                  </Button>
                </div>
              )}
            </div>
          </SurfaceCard>
        </SectionBlock>
      ) : null}

      <QueueSection
        title="Up next"
        description="Queue for the next games. Open a court above to call the first group, or call here then pick a court."
        count={waiting.length}
        entries={waiting}
        empty="No games waiting. Build a matchup and send it here."
        sportId={sportId}
        onReport={report}
        queue={queue}
        showCall
        waitingOnly
      />

      <ButtonLink href="/rankings" variant="secondary" full>
        Session rankings
      </ButtonLink>

      {confirmEnd ? (
        <ConfirmDialog
          danger
          title="End this session?"
          body="Active games must be finished first. Checked-in players and the queue stay until you clear them."
          confirmLabel="End session"
          onCancel={() => setConfirmEnd(false)}
          onConfirm={() => {
            report(queue.endSession(), "Session ended.");
            setConfirmEnd(false);
          }}
        />
      ) : null}
    </div>
  );
}

function TeamCard({ label, players }: { label: string; players: readonly [string, string] }) {
  return (
    <div className="rounded-2xl border border-line bg-foam/60 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-base font-extrabold leading-snug text-pine">{players[0]}</p>
      <p className="text-base font-extrabold leading-snug text-pine">{players[1]}</p>
    </div>
  );
}

function QueueSection({
  title,
  description,
  count,
  entries,
  empty,
  sportId,
  onReport,
  queue,
  showCall,
  waitingOnly,
}: {
  title: string;
  description: string;
  count: number;
  entries: QueueEntry[];
  empty: string;
  sportId: string;
  onReport: (message: string | null, success: string) => void;
  queue: ReturnType<typeof useQueue>;
  showCall?: boolean;
  waitingOnly?: boolean;
}) {
  const { state } = queue;
  if (!state) return null;
  const next = entries[0];

  return (
    <SectionBlock title={title} description={description} count={count}>
      {showCall && next ? (
        <Button full onClick={() => onReport(queue.callNext(sportId), `${entryTitle(next)} called.`)}>
          Call {entryTitle(next)}
        </Button>
      ) : null}
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white/80 px-4 py-4 text-sm text-muted">{empty}</p>
      ) : (
        entries.map((entry) => (
          <SessionGameCard
            key={`${entry.id}-${entry.courtId ?? ""}-${entry.status}`}
            entry={entry}
            onReport={onReport}
            queue={queue}
            waitingOnly={waitingOnly}
          />
        ))
      )}
    </SectionBlock>
  );
}

function SessionGameCard({
  entry,
  onReport,
  queue,
  waitingOnly,
}: {
  entry: QueueEntry;
  onReport: (message: string | null, success: string) => void;
  queue: ReturnType<typeof useQueue>;
  waitingOnly?: boolean;
}) {
  const { remove } = queue;
  const name = entryTitle(entry);

  if (!waitingOnly || entry.status !== "waiting") {
    return null;
  }

  return (
    <SurfaceCard className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{formatLabel(entry.format)}</p>
        <h3 className="text-base font-extrabold leading-snug text-pine">{name}</h3>
      </div>
      <Button variant="danger" onClick={() => onReport(remove(entry.id), "Removed from queue.")}>
        Remove
      </Button>
    </SurfaceCard>
  );
}

function Alert({ error }: { error: string }) {
  return (
    <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-danger">
      {error}
    </p>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <p role="status" className="rounded-2xl border border-lime/50 bg-lime/90 px-4 py-3 text-sm font-bold text-pine">
      {text}
    </p>
  );
}
