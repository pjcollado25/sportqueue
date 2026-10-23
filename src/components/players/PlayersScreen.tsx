"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader, StatTile } from "@/components/ui/bits";
import { SessionRosterPanel } from "@/components/session/SessionRosterPanel";
import { availableToPlay, checkedInPlayers } from "@/lib/session-selectors";

export function PlayersScreen() {
  const queue = useQueue();
  const { state } = queue;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!state) return null;

  const players = [...state.players].sort((a, b) => a.name.localeCompare(b.name));
  const sessionActive = Boolean(state.playSession);
  const checkedIn = checkedInPlayers(state);
  const available = availableToPlay(state);
  const notCheckedInCount = sessionActive
    ? players.filter((player) => !state.playSession!.checkedInPlayerIds.includes(player.id)).length
    : 0;

  function report(message: string | null, success: string) {
    setError(message);
    setNotice(message ? null : success);
  }

  if (!sessionActive) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <PageHeader
          eyebrow="Roster"
          title="Players"
          description="Add and check in players from the Session tab while you set up today’s courts."
        />
        <p className="rounded-3xl border border-line bg-white px-4 py-4 text-sm leading-6 text-muted">
          <Link href="/" className="font-extrabold text-pine underline">Open Session</Link> to run the guided setup — courts,
          roster, and check-in live on one flow.
        </p>
        <SessionRosterPanel mode="roster" onReport={report} />
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <PageHeader
        eyebrow="Roster"
        title="Players"
        description="Full roster tools while the session is live. The Session tab has the same check-in list for quick court work."
      />

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="On roster" value={players.length} />
        <StatTile label="Checked in" value={checkedIn.length} />
        <StatTile label="Available" value={available.length} detail="Not in queue or on court" />
      </div>
      {players.length > 0 ? (
        <Button
          variant="secondary"
          full
          disabled={notCheckedInCount === 0}
          onClick={() => {
            const { error: checkInError, notice: checkInNotice } = queue.checkInAll();
            if (checkInError) report(checkInError, "");
            else report(null, checkInNotice ?? "Checked in.");
          }}
        >
          Check in all{notCheckedInCount > 0 ? ` (${notCheckedInCount})` : ""}
        </Button>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-2xl border border-lime/50 bg-lime/90 px-4 py-3 text-sm font-bold text-pine">
          {notice}
        </p>
      ) : null}

      <SessionRosterPanel mode="live" onReport={report} />
    </div>
  );
}
