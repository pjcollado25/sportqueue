import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinWizard } from "@/components/join/JoinWizard";

export const instant = false;

export const metadata: Metadata = { title: "Join queue" };

export default function JoinPage() {
  return (
    <Suspense fallback={<p className="text-base text-muted">Loading the join form…</p>}>
      <JoinWizard />
    </Suspense>
  );
}
