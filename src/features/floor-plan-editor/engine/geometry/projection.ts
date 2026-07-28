import type { Point } from "../../../../types";
import { clamp, distance, EPSILON } from "./vector";

export interface EdgeProjection {
  edgeIndex: number;
  t: number;
  point: Point;
  distance: number;
}

export const findNearestEdge = (
  target: Point,
  points: Point[],
): EdgeProjection | null => {
  if (points.length < 2) return null;

  let nearest: EdgeProjection | null = null;
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared < EPSILON) continue;

    const t = clamp(
      ((target.x - start.x) * dx + (target.y - start.y) * dy) /
        lengthSquared,
      0,
      1,
    );
    const point = { x: start.x + dx * t, y: start.y + dy * t };
    const candidate: EdgeProjection = {
      edgeIndex: index,
      t,
      point,
      distance: distance(target, point),
    };

    if (!nearest || candidate.distance < nearest.distance) {
      nearest = candidate;
    }
  }

  return nearest;
};
