import { expect, it } from "vitest";
import { contrastRatio, readableBrandColor } from "../../src/utils/colors";
it("editable brand colors remain readable on light and dark surfaces and button foregrounds", () => {
  for (const theme of ["light", "dark"]) {
    const surface = theme === "dark" ? "#19231d" : "#ffffff";
    for (const raw of [
      "#15803d",
      "#ea580c",
      "#ffffff",
      "#000000",
      "#ffff00",
      "#ff00ff",
      "#777777",
    ]) {
      const { color, foreground } = readableBrandColor(raw, theme);
      expect(contrastRatio(color, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(color, foreground)).toBeGreaterThanOrEqual(4.5);
    }
  }
});
