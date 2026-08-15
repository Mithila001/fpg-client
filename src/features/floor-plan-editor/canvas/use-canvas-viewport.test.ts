import { describe, expect, it } from "vitest";
import { fitViewport, recenterViewport } from "./use-canvas-viewport";

const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 50, width: 100, height: 50 };

describe("canvas viewport calculations", () => {
  it("fits bounds with standard and final-plan padding", () => {
    expect(fitViewport(bounds, { width: 600, height: 400 }, 48).scale).toBeCloseTo(5.04);
    expect(fitViewport(bounds, { width: 600, height: 400 }, 88).scale).toBeCloseTo(4.24);
  });

  it("preserves the same world center after a manually navigated viewport resizes", () => {
    const viewport = { scale: 3, x: 40, y: 20 };
    const resized = recenterViewport(viewport, { width: 600, height: 400 }, { width: 400, height: 600 });
    expect((600 / 2 - viewport.x) / viewport.scale).toBeCloseTo((400 / 2 - resized.x) / resized.scale);
    expect((400 / 2 - viewport.y) / viewport.scale).toBeCloseTo((600 / 2 - resized.y) / resized.scale);
  });
});
