import { describe, expect, it } from "vitest";

import { buildVariantMatrix } from "@/lib/variantGenerator";

describe("buildVariantMatrix", () => {
  it("returns empty for no attributes", () => {
    expect(buildVariantMatrix([])).toEqual([]);
  });

  it("returns empty when any attribute lacks values", () => {
    expect(
      buildVariantMatrix([
        { key: "color", values: [] },
        { key: "size", values: ["S"] },
      ]),
    ).toEqual([]);
  });

  it("builds a matrix of combinations", () => {
    const result = buildVariantMatrix([
      { key: "color", values: ["red", "blue"] },
      { key: "size", values: ["S", "M"] },
    ]);

    expect(result).toHaveLength(4);
    expect(result).toContainEqual({ color: "red", size: "S" });
    expect(result).toContainEqual({ color: "red", size: "M" });
    expect(result).toContainEqual({ color: "blue", size: "S" });
    expect(result).toContainEqual({ color: "blue", size: "M" });
  });
});
