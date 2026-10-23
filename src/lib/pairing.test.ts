import { pickSkillPairs } from "@/lib/pairing";
import { describe, expect, it } from "vitest";

describe("skill pairs", () => {
  it("pairs the strongest player with the newest and matches even sides", () => {
    const result = pickSkillPairs([
      { name: "Ana", skill: 5 },
      { name: "Ben", skill: 4 },
      { name: "Cam", skill: 2 },
      { name: "Dee", skill: 1 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pairing.games).toEqual([
      {
        sideA: { players: ["Ana", "Dee"] },
        sideB: { players: ["Ben", "Cam"] },
      },
    ]);
    expect(result.pairing.waitingPair).toBeNull();
    expect(result.pairing.sittingOut).toBeNull();
  });

  it("uses list order when two players share a skill", () => {
    const result = pickSkillPairs([
      { name: "Dee", skill: 3 },
      { name: "Ana", skill: 3 },
      { name: "Ben", skill: 3 },
      { name: "Cam", skill: 3 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pairing.games[0]).toEqual({
      sideA: { players: ["Dee", "Cam"] },
      sideB: { players: ["Ana", "Ben"] },
    });
  });

  it("sits out the lowest-ranked player when the count is odd", () => {
    const result = pickSkillPairs([
      { name: "Ana", skill: 5 },
      { name: "Ben", skill: 4 },
      { name: "Cam", skill: 3 },
      { name: "Dee", skill: 2 },
      { name: "Eli", skill: 1 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pairing.sittingOut).toBe("Eli");
    expect(result.pairing.games).toHaveLength(1);
    expect(result.pairing.games[0].sideA.players).toEqual(["Ana", "Dee"]);
    expect(result.pairing.games[0].sideB.players).toEqual(["Ben", "Cam"]);
  });

  it("holds the closest pair until another pair is free", () => {
    const result = pickSkillPairs([
      { name: "A", skill: 5 },
      { name: "B", skill: 4 },
      { name: "C", skill: 3 },
      { name: "D", skill: 2 },
      { name: "E", skill: 1 },
      { name: "F", skill: 1 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pairing.games).toEqual([
      {
        sideA: { players: ["A", "F"] },
        sideB: { players: ["B", "E"] },
      },
    ]);
    expect(result.pairing.waitingPair).toEqual({ players: ["C", "D"] });
    expect(result.pairing.sittingOut).toBeNull();
  });

  it("rejects a single name and a repeated name", () => {
    expect(pickSkillPairs([{ name: "Ana", skill: 3 }]).ok).toBe(false);
    const duplicate = pickSkillPairs([
      { name: "Ana", skill: 4 },
      { name: "ana", skill: 2 },
    ]);
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;
    expect(duplicate.error).toContain("already on the list");
  });
});
