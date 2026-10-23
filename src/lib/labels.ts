import type { CourtOccupancy, EntryStatus, PlayFormat, QueueEntry } from "@/lib/types";

export function formatLabel(format: PlayFormat): string {
  if (format === "singles") return "Singles";
  if (format === "doubles") return "Doubles";
  return "Team";
}

export function formatHint(format: PlayFormat): string {
  if (format === "singles") return "One player";
  if (format === "doubles") return "You and a partner";
  return "A group playing together";
}

export function statusLabel(status: EntryStatus): string {
  switch (status) {
    case "waiting":
      return "Waiting";
    case "called":
      return "Called";
    case "playing":
      return "Playing";
    case "completed":
      return "Finished";
    case "skipped":
      return "Skipped";
    case "no_show":
      return "No-show";
    case "left":
      return "Left";
    case "removed":
      return "Removed";
  }
}

export function occupancyLabel(occupancy: CourtOccupancy): string {
  switch (occupancy) {
    case "open":
      return "Open";
    case "closed":
      return "Closed";
    case "reserved":
      return "Reserved";
    case "playing":
      return "In play";
  }
}

export function entryTitle(entry: QueueEntry): string {
  if (entry.format === "team") return entry.displayName;
  if (entry.players.length > 1) return entry.players.join(" & ");
  return entry.displayName;
}

export function entryPlayersLine(entry: QueueEntry): string | null {
  if (entry.format !== "team") return null;
  if (entry.players.length === 0) return null;
  if (entry.players.length === 1 && entry.players[0] === entry.displayName) return null;
  return entry.players.join(", ");
}

export function placeLabel(position: number): string {
  if (position <= 1) return "You're next";
  return `You are number ${position}`;
}

export function aheadLabel(position: number): string {
  const ahead = position - 1;
  if (ahead <= 0) return "Nobody is ahead of you.";
  if (ahead === 1) return "1 group is ahead of you.";
  return `${ahead} groups are ahead of you.`;
}

export function waitLabel(joinedAt: string, now: number): string {
  const mins = Math.floor((now - Date.parse(joinedAt)) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return "Just joined";
  if (mins === 1) return "Waiting 1 min";
  if (mins < 60) return `Waiting ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "Waiting 1 hour";
  return `Waiting ${hours} hours`;
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
