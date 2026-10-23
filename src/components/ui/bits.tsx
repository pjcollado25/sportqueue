"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { CourtOccupancy, EntryStatus } from "@/lib/types";
import { occupancyLabel, statusLabel } from "@/lib/labels";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-pine md:text-3xl">{title}</h1>
      {description ? <p className="mt-1 text-base leading-6 text-muted">{description}</p> : null}
    </header>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-white px-4 py-8 text-center">
      <h2 className="text-lg font-extrabold text-pine">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-base leading-6 text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: EntryStatus }) {
  return <span className={cn("inline-flex min-h-7 items-center rounded-full px-3 text-xs font-bold", badgeTone(status))}>{statusLabel(status)}</span>;
}

export function OccupancyBadge({ occupancy }: { occupancy: CourtOccupancy }) {
  return (
    <span className={cn("inline-flex min-h-8 items-center rounded-full px-3 text-sm font-bold", occupancyTone(occupancy))}>
      {occupancyLabel(occupancy)}
    </span>
  );
}

function badgeTone(status: EntryStatus): string {
  if (status === "playing") return "bg-pine text-lime";
  if (status === "called") return "bg-sand text-clay";
  if (status === "waiting") return "bg-lime text-pine";
  if (status === "completed") return "border border-line bg-white text-pine";
  return "bg-line text-muted";
}

function occupancyTone(occupancy: CourtOccupancy): string {
  if (occupancy === "playing") return "bg-pine text-lime";
  if (occupancy === "reserved") return "bg-sand text-clay";
  if (occupancy === "open") return "bg-lime text-pine";
  return "bg-line text-muted";
}

export function FilterChips({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm font-bold touch-manipulation",
              selected ? "bg-pine text-white" : "border border-line bg-white text-pine",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
