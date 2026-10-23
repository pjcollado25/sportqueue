import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { JoinWizard } from "@/components/join/JoinWizard";
import { renderWithQueue } from "@/test/render-with-queue";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/join",
}));

test("a player can join the pickleball queue from a phone-sized form", async () => {
  const user = userEvent.setup();
  renderWithQueue(<JoinWizard />);

  await user.click(screen.getByRole("button", { name: "Pickleball" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("button", { name: /Singles/ }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.type(screen.getByLabelText("Your name"), "Playwright Player");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("button", { name: "Join queue" }));

  expect(await screen.findByText("You're in the queue")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "You're next" }).textContent).toBe("You're next");
});
