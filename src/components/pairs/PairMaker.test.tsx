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

  async function setStars(player: string, stars: number) {
    const item = screen.getByText(player).closest("li");
    if (!item) throw new Error(`Missing ${player}`);
    await user.click(within(item).getByRole("radio", { name: new RegExp(`^${stars} of 6`) }));
  }

  await setStars("Dee", 6);
  await setStars("Ben", 5);
  await setStars("Cam", 3);
  await setStars("Ana", 1);

  expect(screen.getByRole("heading", { name: "Balanced matchups" })).toBeTruthy();
  expect(screen.getByText(/vs/)).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Add this game to Pickleball" }));
  expect((await screen.findByRole("status")).textContent).toContain("1 game added to Pickleball");
});
