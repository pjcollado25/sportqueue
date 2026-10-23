import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { PairMaker } from "@/components/pairs/PairMaker";
import { renderWithQueue } from "@/test/render-with-queue";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

test("a ranked list becomes an even doubles game on the queue", async () => {
  const user = userEvent.setup();
  renderWithQueue(<PairMaker />);

  await user.type(screen.getByLabelText("Names"), "Ana, Ben, Cam, Dee");
  await user.click(screen.getByRole("button", { name: "Add" }));

  async function rank(player: string, skill: string) {
    const item = screen.getByText(player).closest("li");
    if (!item) throw new Error(`Missing ${player}`);
    await user.click(within(item).getByRole("button", { name: skill }));
  }

  await rank("Dee", "Skill 5, strongest");
  await rank("Ben", "Skill 4");
  await rank("Cam", "Skill 2");
  await rank("Ana", "Skill 1, newest");

  expect(screen.getByText("Dee & Ana").textContent).toBe("Dee & Ana");
  expect(screen.getByText("Ben & Cam").textContent).toBe("Ben & Cam");

  await user.click(screen.getByRole("button", { name: "Add this game to Pickleball" }));
  expect((await screen.findByRole("status")).textContent).toContain("1 game added to Pickleball");
});
