import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { SessionHub } from "@/components/session/SessionHub";
import { renderWithQueue } from "@/test/render-with-queue";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

test("shows session setup when no play session is active", () => {
  renderWithQueue(<SessionHub />);
  expect(screen.getByRole("heading", { name: "Pickleball today" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Continue to players" })).toBeTruthy();
});
