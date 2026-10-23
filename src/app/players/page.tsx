import type { Metadata } from "next";
import { PlayersScreen } from "@/components/players/PlayersScreen";

export const instant = false;

export const metadata: Metadata = { title: "Players" };

export default function PlayersPage() {
  return <PlayersScreen />;
}
