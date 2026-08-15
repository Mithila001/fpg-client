import type { FloorPlan, FloorPlanRoom, Point } from "../../../types";
import { polygonArea, polygonBounds, polygonCentroid } from "../engine/geometry/polygon";
import type { PlanDimension, PlanDimensionOrientation } from "../types/workspace.types";

const EPSILON = 1e-6;
// Prefer clear spans close to room walls so annotations do not cross room names.
const SCAN_FRACTIONS = [0.84, 0.16, 0.76, 0.24, 0.5];

const samePoint = (first: Point, second: Point): boolean =>
  Math.abs(first.x - second.x) < EPSILON && Math.abs(first.y - second.y) < EPSILON;

const normalizePolygon = (points: Point[]): Point[] => {
  const finite = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  const unique: Point[] = [];
  for (const point of finite) {
    if (!unique.at(-1) || !samePoint(unique.at(-1)!, point)) unique.push(point);
  }
  if (unique.length > 1 && samePoint(unique[0], unique.at(-1)!)) unique.pop();
  return unique;
};

const pointInPolygon = (point: Point, points: Point[]): boolean => {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const currentPoint = points[index];
    const previousPoint = points[previous];
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y) &&
      point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
        (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
};

interface ScanSpan {
  start: Point;
  end: Point;
  length: number;
}

const scanPolygon = (
  points: Point[],
  orientation: PlanDimensionOrientation,
  coordinate: number,
): ScanSpan[] => {
  const intersections: number[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const first = orientation === "horizontal" ? start.y : start.x;
    const second = orientation === "horizontal" ? end.y : end.x;
    if (!((first <= coordinate && second > coordinate) || (second <= coordinate && first > coordinate))) continue;
    const ratio = (coordinate - first) / (second - first);
    intersections.push(orientation === "horizontal"
      ? start.x + (end.x - start.x) * ratio
      : start.y + (end.y - start.y) * ratio);
  }
  intersections.sort((first, second) => first - second);
  const spans: ScanSpan[] = [];
  for (let index = 0; index + 1 < intersections.length; index += 2) {
    const first = intersections[index];
    const second = intersections[index + 1];
    if (second - first <= EPSILON) continue;
    spans.push(orientation === "horizontal"
      ? { start: { x: first, y: coordinate }, end: { x: second, y: coordinate }, length: second - first }
      : { start: { x: coordinate, y: first }, end: { x: coordinate, y: second }, length: second - first });
  }
  return spans;
};

const longestScanSpan = (
  points: Point[],
  orientation: PlanDimensionOrientation,
): ScanSpan | null => {
  const bounds = polygonBounds(points);
  const minimum = orientation === "horizontal" ? bounds.minY : bounds.minX;
  const extent = orientation === "horizontal" ? bounds.height : bounds.width;
  let best: ScanSpan | null = null;
  for (const fraction of SCAN_FRACTIONS) {
    const coordinate = minimum + extent * fraction;
    for (const span of scanPolygon(points, orientation, coordinate)) {
      if (!best || span.length > best.length) best = span;
    }
  }
  return best;
};

const longestEdgeSpan = (
  points: Point[],
  orientation: PlanDimensionOrientation,
): ScanSpan | null => {
  let best: ScanSpan | null = null;
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const compatible = orientation === "horizontal" ? dx >= dy : dy >= dx;
    const length = Math.hypot(dx, dy);
    if (compatible && length > EPSILON && (!best || length > best.length)) best = { start, end, length };
  }
  return best;
};

const createRoomDimensions = (room: FloorPlanRoom): PlanDimension[] => {
  const points = normalizePolygon(room.boundary.points);
  if (points.length < 3 || polygonArea(points) <= EPSILON) return [];
  const width = longestScanSpan(points, "horizontal") ?? longestEdgeSpan(points, "horizontal");
  const length = longestScanSpan(points, "vertical") ?? longestEdgeSpan(points, "vertical");
  const centroid = polygonCentroid(points);
  const widthMidpoint = width ? {
    x: (width.start.x + width.end.x) / 2,
    y: (width.start.y + width.end.y) / 2,
  } : null;
  const anchor = pointInPolygon(centroid, points)
    ? centroid
    : widthMidpoint ?? points[0];
  const dimensions: PlanDimension[] = [];
  if (width) dimensions.push({
    id: `room-${room.id}-width`, roomId: room.id, kind: "room-width",
    orientation: "horizontal", placement: "inside", start: width.start, end: width.end,
    compactAnchor: anchor, priority: 2,
  });
  if (length) dimensions.push({
    id: `room-${room.id}-length`, roomId: room.id, kind: "room-length",
    orientation: "vertical", placement: "inside", start: length.start, end: length.end,
    compactAnchor: anchor, priority: 2,
  });
  return dimensions;
};

const createOverallDimensions = (plan: FloorPlan): PlanDimension[] => {
  const points = normalizePolygon(plan.boundary.points);
  if (points.length < 3 || polygonArea(points) <= EPSILON) return [];
  const bounds = polygonBounds(points);
  return [
    {
      id: "plan-overall-width", kind: "overall", orientation: "horizontal", placement: "outside",
      start: { x: bounds.minX, y: bounds.maxY }, end: { x: bounds.maxX, y: bounds.maxY },
      side: "outside", offsetPx: 42, priority: 1,
    },
    {
      id: "plan-overall-length", kind: "overall", orientation: "vertical", placement: "outside",
      start: { x: bounds.maxX, y: bounds.minY }, end: { x: bounds.maxX, y: bounds.maxY },
      side: "outside", offsetPx: 42, priority: 1,
    },
  ];
};

export const createPlanDimensions = (plan: FloorPlan): PlanDimension[] => [
  ...plan.rooms.flatMap(createRoomDimensions),
  ...createOverallDimensions(plan),
];

/** @deprecated Use createPlanDimensions for room and overall annotations. */
export const createBoundaryPlanDimensions = createPlanDimensions;

export const averagePoint = (points: Point[]): Point => {
  if (points.length === 0) return { x: 0, y: 0 };
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
};
