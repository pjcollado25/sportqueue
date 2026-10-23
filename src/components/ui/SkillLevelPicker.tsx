"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  SKILL_STAR_MAX,
  skillLevelFromStarCount,
  skillLevelHint,
  skillLevelLabel,
  skillLevelStarCount,
  type SkillLevel,
} from "@/lib/skill";

export function SkillLevelStars({
  level,
  size = "md",
  className,
}: {
  level: SkillLevel | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const filled = skillLevelStarCount(level);
  const icon = size === "sm" ? 14 : 18;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {Array.from({ length: SKILL_STAR_MAX }, (_, index) => {
        const on = index < filled;
        return (
          <Star
            key={index}
            size={icon}
            className={cn(on ? "fill-amber-400 text-amber-500" : "fill-transparent text-line")}
            strokeWidth={on ? 0 : 1.75}
          />
        );
      })}
    </span>
  );
}

export function SkillLevelPicker({
  value,
  onChange,
  label = "Play level",
  id,
}: {
  value: SkillLevel | null;
  onChange: (level: SkillLevel | null) => void;
  label?: string;
  id?: string;
}) {
  const filled = skillLevelStarCount(value);
  const groupId = id ?? "play-level";

  return (
    <div className="grid gap-2">
      <span id={`${groupId}-label`} className="text-sm font-bold text-pine">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        className="flex flex-wrap items-center gap-1"
      >
        {Array.from({ length: SKILL_STAR_MAX }, (_, index) => {
          const star = index + 1;
          const selected = filled === star;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${star} of ${SKILL_STAR_MAX} — ${skillLevelLabel(skillLevelFromStarCount(star))}`}
              onClick={() => onChange(skillLevelFromStarCount(star))}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-xl border transition-colors",
                selected
                  ? "border-amber-300/80 bg-amber-50"
                  : "border-line/80 bg-white hover:border-amber-200 hover:bg-amber-50/50",
              )}
            >
              <Star
                size={22}
                className={cn(
                  star <= filled ? "fill-amber-400 text-amber-500" : "fill-transparent text-muted",
                )}
                strokeWidth={star <= filled ? 0 : 1.75}
              />
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={filled === 0}
          onClick={() => onChange(null)}
          className={cn(
            "min-h-11 rounded-xl border px-3 text-sm font-bold transition-colors",
            filled === 0
              ? "border-pine/25 bg-pine/[0.06] text-pine"
              : "border-line/80 bg-white text-muted hover:border-line",
          )}
        >
          Unrated
        </button>
      </div>
      <p className="text-sm leading-snug text-muted">
        <span className="font-bold text-pine">{skillLevelLabel(value)}</span>
        <span className="text-muted"> — {skillLevelHint(value)}</span>
      </p>
    </div>
  );
}
