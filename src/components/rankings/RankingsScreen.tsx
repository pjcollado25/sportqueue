"use client";

import { StandingsPanel } from "@/components/staff/StandingsPanel";
import { InfoBanner, PageHeader } from "@/components/ui/bits";
import { useQueue } from "@/components/providers/QueueProvider";

export function RankingsScreen() {
  const { state } = useQueue();
  const minGames = state?.session.minGamesForRanking ?? 3;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <PageHeader
        eyebrow="Results"
        title="Rankings"
        description="Ordered by wins this session. Win percentage breaks ties; point differential applies only when every counted game has a score."
      />
      <InfoBanner title="Ranking rules" tone="neutral">
        Players need at least <strong>{minGames}</strong> completed games to appear in the ranked list. Play levels
        (stars) on the Players tab do not affect this table.
      </InfoBanner>
      <StandingsPanel />
    </div>
  );
}
