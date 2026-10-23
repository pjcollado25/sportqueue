"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { CourtOccupancy, EntryStatus } from "@/lib/types";
import { occupancyLabel, statusLabel } from "@/lib/labels";

export function PageHeader({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
}) {
  return (
    <header className="mb-1">
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-wider text-muted">{eyebrow}</p>
      ) : null}
      <h1 className="text-2xl font-extrabold tracking-tight text-pine md:text-3xl">{title}</h1>
      {description ? <p className="mt-2 max-w-prose text-base leading-6 text-muted">{description}</p> : null}
    </header>
  );
}

export function SurfaceCard({
  children,
  className,
  padding = "normal",
}: {
  children: ReactNode;
  className?: string;
  padding?: "normal" | "tight";
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-line/80 bg-white shadow-[0_1px_0_rgb(14_59_46_/0.04),0_8px_24px_rgb(14_59_46_/0.06)]",
        padding === "normal" ? "p-4" : "p-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatTile({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-pine">{value}</p>
      {detail ? <p className="mt-0.5 text-xs leading-snug text-muted">{detail}</p> : null}
    </div>
  );
}

export function SectionBlock({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description?: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-pine">{title}</h2>
            {count !== undefined ? (
              <span className="inline-flex min-h-6 items-center rounded-full bg-foam px-2.5 text-xs font-bold text-pine">
                {count}
              </span>
            ) : null}
          </div>
          {description ? <p className="mt-1 text-sm leading-snug text-muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function InfoBanner({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "warm" | "brand";
}) {
  const tones = {
    neutral: "border-line bg-white text-foreground",
    warm: "border-amber-200/80 bg-sand text-clay",
    brand: "border-pine/20 bg-pine text-white",
  };
  const titleClass = tone === "brand" ? "text-lime" : "text-pine";
  const bodyClass = tone === "brand" ? "text-lime/90" : "text-muted";
  return (
    <div className={cn("rounded-3xl border px-4 py-3", tones[tone])}>
      <p className={cn("text-sm font-extrabold", titleClass)}>{title}</p>
      <div className={cn("mt-1 text-sm leading-6", bodyClass)}>{children}</div>
    </div>
  );
}

/** Subtle selected state — light tint + border, not solid lime fills. */
export function selectionPanelClass(selected: boolean) {
  return cn(
    "transition-colors",
    selected ? "border-pine/40 bg-pine/[0.04] ring-1 ring-pine/10" : "border-line/90 bg-white hover:border-pine/20",
  );
}

export function selectionChipClass(selected: boolean) {
  return cn(
    "transition-colors",
    selected
      ? "border-pine/40 bg-pine/[0.06] text-pine ring-1 ring-pine/10"
      : "border-line bg-white text-pine hover:border-pine/25",
  );
}

export function SelectionCheck({
  selected,
  size = "md",
  className,
}: {
  selected: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const box = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const icon = size === "sm" ? 10 : 12;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border transition-colors",
        box,
        selected ? "border-pine bg-pine text-white" : "border-line bg-white",
        className,
      )}
      aria-hidden
    >
      {selected ? <Check size={icon} strokeWidth={3} /> : null}
    </span>
  );
}

export function PipelineStep({
  label,
  count,
  active,
}: {
  label: string;
  count: number;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl border px-2 py-2 text-center",
        active ? "border-pine/35 bg-pine/[0.04]" : "border-line/80 bg-white",
      )}
    >
      <span className="text-lg font-extrabold tabular-nums text-pine">{count}</span>
      <span className="text-[10px] font-bold leading-tight text-muted">{label}</span>
    </div>
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
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold touch-manipulation",
              selectionChipClass(selected),
            )}
          >
            <SelectionCheck selected={selected} size="sm" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
