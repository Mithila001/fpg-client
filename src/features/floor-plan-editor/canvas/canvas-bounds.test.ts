import { describe, expect, it } from "vitest";
import { boundsFromPoints, mergeBounds } from "./canvas-bounds";

describe("canvas world bounds", () => {
  it("preserves negative Y so the documented front axis remains above the origin", () => {
    const bounds = boundsFromPoints([{ x: -20, y: -40 }, { x: 80, y: 60 }]);
    expect(bounds).toMatchObject({ minX: -20, minY: -40, maxX: 80, maxY: 60, width: 100, height: 100 });
  });

  it("fits parcel context together with a generated plan", () => {
    const parcel = boundsFromPoints([{ x: 0, y: 0 }, { x: 200, y: 160 }]);
    const plan = boundsFromPoints([{ x: 15, y: -10 }, { x: 190, y: 130 }]);
    expect(mergeBounds([parcel, plan])).toMatchObject({ minX: 0, minY: -10, maxX: 200, maxY: 160 });
  });
});
