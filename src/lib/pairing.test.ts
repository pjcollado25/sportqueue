import { pickSkillPairs } from "@/lib/pairing";
import { describe, expect, it } from "vitest";

function player(
  name: string,
  skillLevel: "beginner" | "advanced_beginner" | "intermediate" | "advanced_intermediate" | "advanced" | "expert" | null,
  checkInOrder: number,
  sitOutCount = 0,
) {
  return { name, skillLevel, checkInOrder, sitOutCount };
}

describe("balanced skill pairs", () => {
  it("balances opposing teams by combined skill", () => {
    const result = pickSkillPairs([
      player("Ana", "expert", 1),
      player("Ben", "advanced", 2),
      player("Cam", "intermediate", 3),
      player("Dee", "beginner", 4),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pairing.games).toHaveLength(1);
    const game = result.pairing.games[0];
    expect(new Set([...game.sideA.players, ...game.sideB.players]).size).toBe(4);
  });

  it("rotates sit-outs by fewest recent sit-outs, not lowest skill", () => {
    const result = pickSkillPairs([
      player("Ana", "expert", 1, 0),
      player("Ben", "advanced", 2, 0),
      player("Cam", "beginner", 3, 2),
      player("Dee", "beginner", 4, 0),
      player("Eli", "intermediate", 5, 0),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pairing.sittingOut).toBe("Cam");
  });

  it("rejects a single name and a repeated name", () => {
    expect(pickSkillPairs([player("Ana", "intermediate", 1)]).ok).toBe(false);
    const duplicate = pickSkillPairs([player("Ana", "advanced", 1), player("ana", "beginner", 2)]);
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;
    expect(duplicate.error).toContain("already on the list");
  });
});
