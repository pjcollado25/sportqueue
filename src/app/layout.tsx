import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { QueueProvider } from "@/components/providers/QueueProvider";
import "./globals.css";

export const instant = false;

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: "SportQueue",
    template: "%s · SportQueue",
  },
  description: "Run pickleball court sessions on this phone — check-ins, balanced doubles, courts, and rankings.",
  applicationName: "SportQueue",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e3b2e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-foam font-sans text-foreground">
        <Suspense fallback={<div className="min-h-dvh bg-foam" />}>
          <QueueProvider>
            <AppShell>{children}</AppShell>
          </QueueProvider>
        </Suspense>
      </body>
    </html>
  );
}
