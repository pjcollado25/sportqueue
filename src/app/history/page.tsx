import type { Metadata } from "next";
import { MatchHistory } from "@/components/history/MatchHistory";

export const instant = false;

export const metadata: Metadata = { title: "Match history" };

export default function HistoryPage() {
  return <MatchHistory />;
}
