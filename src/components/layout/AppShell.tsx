"use client";

import { ClipboardList, History, Menu, Settings, Trophy, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQueue } from "@/components/providers/QueueProvider";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  description?: string;
};

const primaryNav: NavItem[] = [
  { href: "/", label: "Session", short: "Session", icon: ClipboardList, description: "Courts, Up Next, and live games" },
  { href: "/players", label: "Players", short: "Players", icon: Users, description: "Roster, play levels, and check-in" },
  { href: "/rankings", label: "Rankings", short: "Ranks", icon: Trophy, description: "Wins and win percentage" },
  { href: "/history", label: "Game history", short: "History", icon: History, description: "Finished games, including past sports" },
];

const moreNav: NavItem[] = [
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings, description: "Venue name and backup" },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, state } = useQueue();
  const [morePath, setMorePath] = useState<string | null>(null);
  const moreOpen = morePath === pathname;
  const moreCurrent = moreNav.some((item) => isCurrent(pathname, item.href));
  const sessionActive = Boolean(state?.playSession);

  return (
    <div className="min-h-dvh bg-foam text-foreground">
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-30">
        <div className="bg-pine text-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime text-2xl" aria-hidden>
              🏓
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold leading-tight">SportQueue</p>
              <p className="truncate text-sm text-lime">
                {ready && state ? state.venue.name : "This phone"}
                {sessionActive ? " · Live session" : " · No active session"}
              </p>
            </div>
            {sessionActive ? (
              <span className="shrink-0 rounded-full bg-lime/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-lime">
                On court
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl">
        <aside className="sticky top-[4.25rem] hidden h-[calc(100dvh-4.25rem)] w-64 shrink-0 overflow-y-auto border-r border-line/60 px-4 py-5 md:block">
          <nav aria-label="Sections" className="grid gap-1 rounded-3xl border border-line/70 bg-white p-2 shadow-sm">
            {[...primaryNav, ...moreNav].map((item) => (
              <NavLink key={item.href} item={item} current={isCurrent(pathname, item.href)} />
            ))}
          </nav>
          <p className="mt-6 rounded-2xl bg-white p-3 text-xs leading-5 text-muted">
            Saved in this browser only. Not shared across phones or accounts.
          </p>
        </aside>
        <main
          id="content"
          className="w-full min-w-0 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-10 md:pt-6"
        >
          {ready && state ? children : <LoadingScreen />}
        </main>
      </div>

      {moreOpen ? (
        <div className="fixed inset-0 z-30 md:hidden">
          <button type="button" className="absolute inset-0 bg-pine-deep/50" aria-label="Close menu" onClick={() => setMorePath(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More pages"
            className="absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] rounded-t-3xl bg-white p-4 shadow-xl"
          >
            <p className="px-1 text-sm font-bold text-muted">More</p>
            <div className="mt-2 grid gap-2">
              {moreNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                  className="flex min-h-16 items-center gap-3 rounded-2xl px-3 text-left active:bg-foam"
                  onClick={() => setMorePath(null)}
                >
                  <item.icon aria-hidden size={22} />
                  <span>
                    <span className="block text-base font-extrabold text-pine">{item.label}</span>
                    <span className="block text-sm text-muted">{item.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {primaryNav.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold leading-none",
                    current ? "text-pine" : "text-muted",
                  )}
                >
                  <item.icon aria-hidden size={22} strokeWidth={current ? 2.5 : 2} />
                  {item.short}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-current={moreCurrent ? "page" : undefined}
              onClick={() => setMorePath((current) => (current === pathname ? null : pathname))}
              className={cn(
                "flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-bold leading-none",
                moreCurrent || moreOpen ? "text-pine" : "text-muted",
              )}
            >
              <Menu aria-hidden size={22} strokeWidth={moreCurrent || moreOpen ? 2.5 : 2} />
              More
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function NavLink({ item, current }: { item: NavItem; current: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-base font-bold transition-colors",
        current ? "bg-pine text-lime" : "text-pine hover:bg-foam",
      )}
    >
      <item.icon aria-hidden size={20} strokeWidth={current ? 2.5 : 2} />
      {item.label}
    </Link>
  );
}

function LoadingScreen() {
  return (
    <div aria-busy="true" className="grid gap-3">
      <div className="h-8 w-40 rounded-full bg-white" />
      <div className="h-28 rounded-3xl bg-white" />
      <div className="h-14 rounded-2xl bg-white" />
      <p className="text-base text-muted">Opening SportQueue…</p>
    </div>
  );
}
