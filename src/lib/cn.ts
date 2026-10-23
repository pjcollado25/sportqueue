export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const fieldClass =
  "h-14 w-full rounded-2xl border border-line bg-white px-4 text-base text-foreground outline-none focus:border-pine focus:ring-2 focus:ring-pine/30";
