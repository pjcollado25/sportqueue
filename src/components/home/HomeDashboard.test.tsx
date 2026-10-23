import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { renderWithQueue } from "@/test/render-with-queue";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

test("home shows live counts and the main actions", () => {
  renderWithQueue(<HomeDashboard />);
  expect(screen.getByRole("heading", { name: "Welcome" }).textContent).toBe("Welcome");
  expect(screen.getByText("You're at Riverside Courts.").textContent).toContain("Riverside Courts");
  expect(screen.getByRole("link", { name: "Join queue" }).getAttribute("href")).toBe("/join");
  expect(screen.getByRole("link", { name: "Make pairs" }).getAttribute("href")).toBe("/pairs");
  expect(screen.getByRole("link", { name: "Staff dashboard" }).getAttribute("href")).toBe("/staff");
  expect(screen.getByText("Waiting").parentElement?.textContent).toContain("2");
  expect(screen.getByText("Playing").parentElement?.textContent).toContain("1");
  expect(screen.getByText("Open courts").parentElement?.textContent).toContain("4");
});
