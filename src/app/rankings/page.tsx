import type { Metadata } from "next";
import { RankingsScreen } from "@/components/rankings/RankingsScreen";

export const instant = false;

export const metadata: Metadata = { title: "Rankings" };

export default function RankingsPage() {
  return <RankingsScreen />;
}
