"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/bits";
import { fieldClass, cn } from "@/lib/cn";
import { createId } from "@/lib/ids";
import { SkillLevelPicker } from "@/components/ui/SkillLevelPicker";
import { playerNameKey, SKILL_LEVELS, type SkillLevel } from "@/lib/skill";
import { pairLine, pickSkillPairs, type SkillPairing } from "@/lib/pairing";
import { selectableSports } from "@/lib/selectors";

type DraftPlayer = {
  id: string;
  name: string;
  skillLevel: SkillLevel | null;
  checkInOrder: number;
  sitOutCount: number;
  order: number;
};

function byRank(players: DraftPlayer[]): DraftPlayer[] {
  return [...players].sort((a, b) => {
    const aw = a.skillLevel ? SKILL_LEVELS.indexOf(a.skillLevel) : -1;
    const bw = b.skillLevel ? SKILL_LEVELS.indexOf(b.skillLevel) : -1;
    return bw - aw || a.checkInOrder - b.checkInOrder || a.order - b.order;
  });
}

function addedNotice(pairing: SkillPairing, sportName: string): string {
  const parts: string[] = [];
  if (pairing.games.length === 1) parts.push(`1 game added to ${sportName}`);
  else if (pairing.games.length > 1) parts.push(`${pairing.games.length} games added to ${sportName}`);
  else if (pairing.waitingPair) parts.push(`1 pair added to ${sportName}`);
  if (pairing.games.length > 0 && pairing.waitingPair) parts.push("one pair is still waiting for opponents");
  if (pairing.sittingOut) parts.push(`${pairing.sittingOut} sits out this round (fair rotation)`);
  return `${parts.join(". ")}.`;
}

function addButtonLabel(pairing: SkillPairing, sportName: string): string {
  if (pairing.games.length > 1) return `Add ${pairing.games.length} games to ${sportName}`;
  if (pairing.games.length === 1 && pairing.waitingPair) return `Add this game and the extra pair to ${sportName}`;
  if (pairing.games.length === 1) return `Add this game to ${sportName}`;
  return `Add this pair to ${sportName}`;
}

export function PairMaker() {
  const queue = useQueue();
  const { state } = queue;
  const [sportId, setSportId] = useState("");
  const [name, setName] = useState("");
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  if (!state) return null;

  const sports = selectableSports(state).filter((sport) => sport.formats.includes("doubles"));
  const selectedId = sports.some((sport) => sport.id === sportId) ? sportId : (sports[0]?.id ?? "");
  const sport = sports.find((item) => item.id === selectedId);
  const ranked = byRank(players);
  const picked =
    players.length > 0
      ? pickSkillPairs(
          ranked.map((player) => ({
            name: player.name,
            skillLevel: player.skillLevel,
            checkInOrder: player.checkInOrder,
            sitOutCount: player.sitOutCount,
          })),
          { partnerHistory: new Set(state.partnerHistory) },
        )
      : null;

  function profileForName(raw: string) {
    return state!.players.find((player) => playerNameKey(player.name) === playerNameKey(raw));
  }

  function addNames(raw: string) {
    const parts = raw
      .split(/[\n,]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      setError("Enter a name.");
      setNotice(null);
      return;
    }

    const seen = new Set(players.map((player) => playerNameKey(player.name)));
    const next = [...players];
    let order = next.reduce((max, player) => Math.max(max, player.order), 0);
    let problem: string | null = null;
    for (const part of parts) {
      if (next.length >= 24) {
        problem = "Add up to 24 names.";
        break;
      }
      if (part.length > 40) {
        problem = "Use 40 characters or fewer for each name.";
        continue;
      }
      if (seen.has(playerNameKey(part))) {
        problem = `${part} is already on the list.`;
        continue;
      }
      seen.add(playerNameKey(part));
      order += 1;
      const profile = profileForName(part);
      next.push({
        id: createId(),
        name: profile?.name ?? part,
        skillLevel: profile?.skillLevel ?? null,
        checkInOrder: profile?.checkInOrder ?? order,
        sitOutCount: profile?.sitOutCount ?? 0,
        order,
      });
    }

    if (next.length === players.length) {
      setError(problem ?? "Enter a name.");
      setNotice(null);
      return;
    }

    setPlayers(next);
    setName("");
    setError(problem);
    setNotice(null);
  }

  function setSkillLevel(id: string, skillLevel: SkillLevel | null) {
    setPlayers((current) => current.map((player) => (player.id === id ? { ...player, skillLevel } : player)));
    setNotice(null);
  }

  function move(id: string, direction: -1 | 1) {
    const ordered = byRank(players);
    const index = ordered.findIndex((player) => player.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    if (ordered[index].skillLevel !== ordered[target].skillLevel) return;
    const currentOrder = ordered[index].order;
    const targetOrder = ordered[target].order;
    setPlayers((current) =>
      current.map((player) => {
        if (player.id === ordered[index].id) return { ...player, order: targetOrder };
        if (player.id === ordered[target].id) return { ...player, order: currentOrder };
        return player;
      }),
    );
    setNotice(null);
  }

  function remove(id: string) {
    setPlayers((current) => current.filter((player) => player.id !== id));
    setNotice(null);
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <PageHeader
        title="Make pairs"
        description="Balanced doubles: teams are close in combined skill. Check-in order and wait time decide who sits out — not rating alone."
      />

      {sports.length === 0 ? (
        <p className="text-base text-muted">Turn on a sport that offers doubles, such as pickleball or tennis, before making pairs.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sport">
            {sports.map((item) => {
              const selected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSportId(item.id)}
                  className={cn(
                    "min-h-11 rounded-full px-4 text-sm font-bold touch-manipulation",
                    selected ? "bg-pine text-white" : "border border-line bg-white text-pine",
                  )}
                >
                  <span aria-hidden>{item.icon} </span>
                  {item.name}
                </button>
              );
            })}
          </div>

          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addNames(name);
            }}
          >
            <label>
              <span className="text-sm font-bold">Names</span>
              <input
                className={cn(fieldClass, "mt-2")}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ana, or Ana, Ben, Cam"
                autoCapitalize="words"
                autoComplete="off"
                enterKeyHint="done"
              />
            </label>
            <Button type="submit" full>
              Add
            </Button>
          </form>
          <p className="text-sm leading-6 text-muted">
            Skill levels are estimates for open play, not official ratings. Unrated players are balanced toward the middle. With an odd count, whoever sat out least recently waits — not automatically the lowest skill.
          </p>

          {error ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="rounded-2xl bg-lime px-4 py-3 text-sm font-bold text-pine">
              {notice}{" "}
              <Link href="/queue" className="underline">
                See the live queue
              </Link>
            </p>
          ) : null}

          {ranked.length === 0 ? (
            <p className="rounded-3xl bg-white px-4 py-6 text-base text-muted">The list is empty. Add the people who want to play.</p>
          ) : (
            <ol className="grid gap-2" aria-label="Players ranked by skill">
              {ranked.map((player, index) => {
                const above = ranked[index - 1];
                const below = ranked[index + 1];
                return (
                  <li key={player.id} className="rounded-3xl bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-muted">Rank {index + 1}</p>
                        <p className="break-words text-lg font-extrabold text-pine">{player.name}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          aria-label={`Move ${player.name} up`}
                          disabled={!above || above.skillLevel !== player.skillLevel}
                          onClick={() => move(player.id, -1)}
                          className="grid h-11 w-11 place-items-center rounded-xl border border-line text-pine disabled:opacity-40"
                        >
                          <ChevronUp aria-hidden size={20} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${player.name} down`}
                          disabled={!below || below.skillLevel !== player.skillLevel}
                          onClick={() => move(player.id, 1)}
                          className="grid h-11 w-11 place-items-center rounded-xl border border-line text-pine disabled:opacity-40"
                        >
                          <ChevronDown aria-hidden size={20} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${player.name}`}
                          onClick={() => remove(player.id)}
                          className="grid h-11 w-11 place-items-center rounded-xl border border-line text-pine"
                        >
                          <X aria-hidden size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <SkillLevelPicker
                        id={`pair-play-level-${player.id}`}
                        value={player.skillLevel}
                        onChange={(level) => setSkillLevel(player.id, level)}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {picked?.ok ? (
            <section className="grid gap-2" aria-label="Suggested pairs">
              <h2 className="text-lg font-extrabold text-pine">Balanced matchups</h2>
              {picked.pairing.games.map((game, index) => (
                <article key={`${game.sideA.players[0]}-${game.sideB.players[0]}`} className="rounded-3xl bg-white p-4">
                  <p className="text-sm font-bold text-muted">Game {index + 1}</p>
                  <p className="mt-1 text-xl font-extrabold text-pine">{pairLine(game.sideA.players)}</p>
                  <p className="text-sm font-bold text-muted">vs</p>
                  <p className="text-xl font-extrabold text-pine">{pairLine(game.sideB.players)}</p>
                </article>
              ))}
              {picked.pairing.waitingPair ? (
                <article className="rounded-3xl bg-white p-4">
                  <p className="text-sm font-bold text-muted">Waiting for another pair</p>
                  <p className="mt-1 text-xl font-extrabold text-pine">{pairLine(picked.pairing.waitingPair.players)}</p>
                </article>
              ) : null}
              {picked.pairing.sittingOut ? (
                <p className="rounded-3xl bg-sand px-4 py-3 text-sm font-semibold leading-6 text-clay">
                  {picked.pairing.sittingOut} sits this round based on fair rotation (fewest recent sit-outs, then check-in order).
                </p>
              ) : null}
              <Button
                full
                onClick={() => {
                  if (!sport || !picked.ok) return;
                  const message = queue.addSkillPairs(
                    sport.id,
                    ranked.map((player) => ({
                      name: player.name,
                      skillLevel: player.skillLevel,
                      checkInOrder: player.checkInOrder,
                      sitOutCount: player.sitOutCount,
                    })),
                  );
                  if (message) {
                    setError(message);
                    setNotice(null);
                    return;
                  }
                  setError(null);
                  setNotice(addedNotice(picked.pairing, sport.name));
                  setPlayers([]);
                  setName("");
                }}
              >
                {addButtonLabel(picked.pairing, sport?.name ?? "the queue")}
              </Button>
              <p className="text-sm leading-6 text-muted">
                These games go on the {sport?.name ?? "sport"} queue. Remove one from the staff dashboard if someone cancels.
              </p>
            </section>
          ) : picked ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">
              {picked.error}
            </p>
          ) : null}

          <ButtonLink href="/queue" variant="secondary" full>
            See the live queue
          </ButtonLink>
        </>
      )}
    </div>
  );
}
