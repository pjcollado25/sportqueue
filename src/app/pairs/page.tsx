import type { Metadata } from "next";
import { PairMaker } from "@/components/pairs/PairMaker";

export const instant = false;

export const metadata: Metadata = { title: "Make pairs" };

export default function PairsPage() {
  return <PairMaker />;
}
