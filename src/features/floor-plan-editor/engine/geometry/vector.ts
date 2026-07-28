import type { Point } from "../../../../types";

export const EPSILON = 1e-8;

export const distance = (a: Point, b: Point): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const snapPoint = (point: Point, step: number): Point => ({
  x: Math.round(point.x / step) * step,
  y: Math.round(point.y / step) * step,
});
