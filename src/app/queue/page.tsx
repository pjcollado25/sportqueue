import type { Metadata } from "next";
import { LiveQueue } from "@/components/queue/LiveQueue";

export const instant = false;

export const metadata: Metadata = { title: "Live queue" };

export default function QueuePage() {
  return <LiveQueue />;
}
