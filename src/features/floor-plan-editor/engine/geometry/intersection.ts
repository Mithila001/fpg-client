import type { Point } from "../../../../types";
import { EPSILON } from "./vector";

const orientation = (a: Point, b: Point, c: Point): number => {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < EPSILON) return 0;
  return value > 0 ? 1 : 2;
};

const pointOnSegment = (a: Point, b: Point, point: Point): boolean =>
  point.x <= Math.max(a.x, b.x) + EPSILON &&
  point.x + EPSILON >= Math.min(a.x, b.x) &&
  point.y <= Math.max(a.y, b.y) + EPSILON &&
  point.y + EPSILON >= Math.min(a.y, b.y);

export const segmentsIntersect = (
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
): boolean => {
  const o1 = orientation(firstStart, firstEnd, secondStart);
  const o2 = orientation(firstStart, firstEnd, secondEnd);
  const o3 = orientation(secondStart, secondEnd, firstStart);
  const o4 = orientation(secondStart, secondEnd, firstEnd);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && pointOnSegment(firstStart, firstEnd, secondStart)) return true;
  if (o2 === 0 && pointOnSegment(firstStart, firstEnd, secondEnd)) return true;
  if (o3 === 0 && pointOnSegment(secondStart, secondEnd, firstStart)) return true;
  if (o4 === 0 && pointOnSegment(secondStart, secondEnd, firstEnd)) return true;
  return false;
};
