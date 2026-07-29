import type { Point } from "../../../types";
import type { WorldBounds } from "./canvas.types";

const EMPTY_BOUNDS: WorldBounds = {
  minX: 0,
  minY: 0,
  maxX: 1,
  maxY: 1,
  width: 1,
  height: 1,
};

export const boundsFromPoints = (points: Point[]): WorldBounds => {
  if (points.length === 0) return EMPTY_BOUNDS;

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
};

export const mergeBounds = (
  bounds: Array<WorldBounds | null | undefined>,
): WorldBounds => {
  const available = bounds.filter((value): value is WorldBounds => Boolean(value));
  if (available.length === 0) return EMPTY_BOUNDS;

  const minX = Math.min(...available.map((value) => value.minX));
  const minY = Math.min(...available.map((value) => value.minY));
  const maxX = Math.max(...available.map((value) => value.maxX));
  const maxY = Math.max(...available.map((value) => value.maxY));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
};

export const expandBounds = (
  bounds: WorldBounds,
  padding: number,
): WorldBounds => ({
  minX: bounds.minX - padding,
  minY: bounds.minY - padding,
  maxX: bounds.maxX + padding,
  maxY: bounds.maxY + padding,
  width: Math.max(1, bounds.width + padding * 2),
  height: Math.max(1, bounds.height + padding * 2),
});
