import type { Point } from "../../../../types";
import { distance, EPSILON } from "./vector";

export interface PolygonBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export const signedPolygonArea = (points: Point[]): number => {
  if (points.length < 3) return 0;

  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return sum / 2;
};

export const polygonArea = (points: Point[]): number =>
  Math.abs(signedPolygonArea(points));

export const polygonCentroid = (points: Point[]): Point => {
  if (points.length === 0) return { x: 0, y: 0 };

  const signedArea = signedPolygonArea(points);
  if (Math.abs(signedArea) < EPSILON) {
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
  }

  let x = 0;
  let y = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const factor = current.x * next.y - next.x * current.y;
    x += (current.x + next.x) * factor;
    y += (current.y + next.y) * factor;
  }

  return {
    x: x / (6 * signedArea),
    y: y / (6 * signedArea),
  };
};

export const polygonBounds = (points: Point[]): PolygonBounds => {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
  }

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

export const longestEdgeIndex = (points: Point[]): number => {
  if (points.length < 2) return 0;

  let longestIndex = 0;
  let longestLength = -Infinity;
  for (let index = 0; index < points.length; index += 1) {
    const length = distance(points[index], points[(index + 1) % points.length]);
    if (length > longestLength) {
      longestLength = length;
      longestIndex = index;
    }
  }
  return longestIndex;
};
