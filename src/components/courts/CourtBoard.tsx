"use client";

import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, OccupancyBadge, PageHeader } from "@/components/ui/bits";
import { fieldClass } from "@/lib/cn";
import { entryTitle } from "@/lib/labels";
import { courtOccupancy, sportName } from "@/lib/selectors";

export function CourtBoard() {
  const { state, addCourt, updateCourt, setCourtClosed, removeCourt } = useQueue();
  const [name, setName] = useState("");
  const [sportIds, setSportIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  if (!state) return null;

  function toggleSport(sportId: string) {
    setSportIds((current) => (current.includes(sportId) ? current.filter((id) => id !== sportId) : [...current, sportId]));
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <PageHeader title="Courts" description="See which courts are open, reserved, or in a game." />
      {state.courts.length === 0 ? (
        <EmptyState title="No courts yet" body="Add a court in the staff tools below so players know where to go." />
      ) : (
        <ul className="grid gap-3">
          {state.courts.map((court) => {
            const occupancy = courtOccupancy(state, court.id);
            const sports = court.sportIds.length === 0 ? "Any sport" : court.sportIds.map((id) => sportName(state, id)).join(", ");
            return (
              <li key={court.id} className="rounded-3xl bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-extrabold text-pine">{court.name}</h2>
                    <p className="mt-1 text-sm text-muted">{sports}</p>
                  </div>
                  <OccupancyBadge occupancy={occupancy.occupancy} />
                </div>
                <p className="mt-3 text-base">
                  {occupancy.entry
                    ? `${entryTitle(occupancy.entry)} · ${sportName(state, occupancy.entry.sportId)}`
                    : occupancy.occupancy === "closed"
                      ? "This court is closed."
                      : "Nobody is assigned."}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <details className="rounded-3xl bg-white p-4">
        <summary className="cursor-pointer text-base font-extrabold text-pine">Staff tools for courts</summary>
        <p className="mt-2 text-sm leading-6 text-muted">
          These tools change courts on this phone only. They are not a password-protected login.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-bold text-danger">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-3 text-sm font-bold text-pine">
            {notice}
          </p>
        ) : null}

        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const message = editingId ? updateCourt(editingId, { name, sportIds }) : addCourt({ name, sportIds });
            if (message) {
              setError(message);
              setNotice(null);
              return;
            }
            setError(null);
            setNotice(editingId ? "Court updated." : "Court added.");
            setName("");
            setSportIds([]);
            setEditingId(null);
          }}
        >
          <h3 className="text-base font-extrabold text-pine">{editingId ? "Edit court" : "Add a court"}</h3>
          <label className="block">
            <span className="text-sm font-bold">Court name</span>
            <input className={`${fieldClass} mt-2`} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
          </label>
          <fieldset>
            <legend className="text-sm font-bold">Sports on this court</legend>
            <p className="mt-1 text-sm text-muted">Leave them all off to allow any sport.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {state.sports.map((sport) => {
                const selected = sportIds.includes(sport.id);
                return (
                  <button
                    key={sport.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSport(sport.id)}
                    className={
                      selected
                        ? "min-h-11 rounded-full bg-pine px-4 text-sm font-bold text-white"
                        : "min-h-11 rounded-full border border-line bg-white px-4 text-sm font-bold text-pine"
                    }
                  >
                    {sport.icon} {sport.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Button type="submit" full>
            {editingId ? "Save court" : "Add court"}
          </Button>
          {editingId ? (
            <Button
              variant="secondary"
              full
              onClick={() => {
                setEditingId(null);
                setName("");
                setSportIds([]);
              }}
            >
              Cancel edit
            </Button>
          ) : null}
        </form>

        <ul className="mt-4 grid gap-3">
          {state.courts.map((court) => (
            <li key={court.id} className="rounded-2xl border border-line p-3">
              <p className="font-extrabold text-pine">{court.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingId(court.id);
                    setName(court.name);
                    setSportIds(court.sportIds);
                    setError(null);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const message = setCourtClosed(court.id, !court.closed);
                    setError(message);
                    setNotice(message ? null : court.closed ? "Court opened." : "Court closed.");
                  }}
                >
                  {court.closed ? "Open" : "Close"}
                </Button>
                <Button variant="danger" className="col-span-2" onClick={() => setPendingRemove(court.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </details>

      {pendingRemove ? (
        <ConfirmDialog
          danger
          title="Remove this court?"
          body="Players will no longer be able to ask for it. A court in a game cannot be removed."
          confirmLabel="Remove court"
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => {
            const message = removeCourt(pendingRemove);
            setPendingRemove(null);
            setError(message);
            setNotice(message ? null : "Court removed.");
          }}
        />
      ) : null}
    </div>
  );
}
