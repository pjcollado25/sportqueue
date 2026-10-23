import type { Metadata } from "next";
import { HomeDashboard } from "@/components/home/HomeDashboard";

export const instant = false;

export const metadata: Metadata = {
  title: { absolute: "SportQueue" },
};

export default function HomePage() {
  return <HomeDashboard />;
}
