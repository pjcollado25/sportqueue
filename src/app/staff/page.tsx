import type { Metadata } from "next";
import { StaffDashboard } from "@/components/staff/StaffDashboard";

export const instant = false;

export const metadata: Metadata = { title: "Staff dashboard" };

export default function StaffPage() {
  return <StaffDashboard />;
}
