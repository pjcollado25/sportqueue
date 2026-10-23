import type { Metadata } from "next";
import { SessionHub } from "@/components/session/SessionHub";

export const instant = false;

export const metadata: Metadata = {
  title: { absolute: "SportQueue" },
};

export default function HomePage() {
  return <SessionHub />;
}
