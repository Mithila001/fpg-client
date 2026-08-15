import { describe, expect, it } from "vitest";
import type { FloorPlan, FloorPlanRoom, Point } from "../../../types";
import { createPlanDimensions } from "./plan-dimensions";

const room = (id: string, points: Point[]): FloorPlanRoom => ({
  id,
  roomType: id.startsWith("hall") ? "hallway" : "bedroom",
  name: id,
  boundary: { points },
  role: "standard",
  parentRoomId: null,
  metadata: { sourceRoomIds: [id], appliedTransformations: [] },
});

const plan = (rooms: FloorPlanRoom[], boundary = [
  { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }, { x: 0, y: 80 },
]): FloorPlan => ({ boundary: { points: boundary }, rooms, openings: [], identityRedirects: {}, appliedTransformations: [] });

const length = (start: Point, end: Point) => Math.hypot(end.x - start.x, end.y - start.y);

describe("floor-plan dimension layout", () => {
  it("creates two room spans and two restrained overall dimensions", () => {
    const dimensions = createPlanDimensions(plan([room("bedroom-1", [
      { x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 40 }, { x: 10, y: 40 },
    ])]));
    expect(dimensions).toHaveLength(4);
    expect(dimensions.filter((item) => item.kind === "overall")).toHaveLength(2);
    expect(length(dimensions[0].start, dimensions[0].end)).toBeCloseTo(40);
    expect(length(dimensions[1].start, dimensions[1].end)).toBeCloseTo(30);
  });

  it("uses valid scanline spans for a concave room", () => {
    const dimensions = createPlanDimensions(plan([room("l-room", [
      { x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 10 },
      { x: 20, y: 10 }, { x: 20, y: 40 }, { x: 0, y: 40 },
    ])])).filter((item) => item.roomId === "l-room");
    expect(dimensions).toHaveLength(2);
    expect(dimensions.every((item) => length(item.start, item.end) > 0)).toBe(true);
  });

  it("keeps both dimensions for a narrow hallway and rotated room", () => {
    const dimensions = createPlanDimensions(plan([
      room("hallway-1", [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 6 }, { x: 0, y: 6 }]),
      room("rotated", [{ x: 70, y: 20 }, { x: 80, y: 10 }, { x: 90, y: 20 }, { x: 80, y: 30 }]),
    ]));
    expect(dimensions.filter((item) => item.roomId === "hallway-1")).toHaveLength(2);
    expect(dimensions.filter((item) => item.roomId === "rotated")).toHaveLength(2);
  });

  it("normalizes a duplicate closing point and ignores invalid rooms", () => {
    const dimensions = createPlanDimensions(plan([
      room("closed", [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }, { x: 0, y: 0 }]),
      room("invalid", [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }]),
    ]));
    expect(dimensions.filter((item) => item.roomId === "closed")).toHaveLength(2);
    expect(dimensions.some((item) => item.roomId === "invalid")).toBe(false);
  });
});
