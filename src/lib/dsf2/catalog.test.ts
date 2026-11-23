import { describe, expect, it } from "vitest";
import { riskLevel } from "./catalog";

describe("matrice del rischio", () => {
  it("R = P x E con i valori 1-4", () => {
    expect(riskLevel(2, 2).r).toBe(9); // P3 x E3
    expect(riskLevel(3, 3).r).toBe(16);
  });
  it("soglie come nel PSC CerTus", () => {
    expect(riskLevel(0, 1).label).toBe("Basso"); // 2
    expect(riskLevel(0, 2).label).toBe("Moderato"); // 3
    expect(riskLevel(1, 2).label).toBe("Medio"); // 6
    expect(riskLevel(2, 2).label).toBe("Rilevante"); // 9
    expect(riskLevel(2, 3).label).toBe("Alto"); // 12
  });
});
