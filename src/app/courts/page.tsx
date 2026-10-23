import type { Metadata } from "next";
import { CourtBoard } from "@/components/courts/CourtBoard";

export const instant = false;

export const metadata: Metadata = { title: "Courts" };

export default function CourtsPage() {
  return <CourtBoard />;
}
