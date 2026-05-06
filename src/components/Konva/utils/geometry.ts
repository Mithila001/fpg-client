import type { RoomPoint, RoomPoints } from "../InputPlanCanvas";
import type { CornerKey } from "../InputPlanCanvas";

export interface BoundarySegmentProjection {
  segmentIndex: number;
  distance: number;
  t: number;
  closestPoint: RoomPoint;
}

export interface RoadPlacement {
  segmentIndex: number;
  t: number;
  width: number;
  length: number;
  gap: number;
}

export interface RoadPolygonResult {
  polygon: RoomPoint[];
}

const EPSILON = 1e-8;

export const calculatePolygonArea = (points: RoomPoints, orderedKeys: CornerKey[]): number => {
  if (orderedKeys.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < orderedKeys.length; i++) {
    const p1 = points[orderedKeys[i]];
    const p2 = points[orderedKeys[(i + 1) % orderedKeys.length]];
    area += (p1.x * p2.y - p2.x * p1.y);
  }
  return Math.abs(area) / 2.0;
};

export const calculatePolygonCentroid = (points: RoomPoints, orderedKeys: CornerKey[]): RoomPoint => {
  if (orderedKeys.length < 3) return { x: 0, y: 0 };
  let cx = 0;
  let cy = 0;
  let signedArea = 0;

  for (let i = 0; i < orderedKeys.length; i++) {
    const p1 = points[orderedKeys[i]];
    const p2 = points[orderedKeys[(i + 1) % orderedKeys.length]];
    const a = (p1.x * p2.y - p2.x * p1.y);
    signedArea += a;
    cx += (p1.x + p2.x) * a;
    cy += (p1.y + p2.y) * a;
  }

  signedArea *= 0.5;
  
  if (Math.abs(signedArea) < 1e-6) {
    // Fallback to average if area is 0
    return {
      x: orderedKeys.reduce((sum, key) => sum + points[key].x, 0) / orderedKeys.length,
      y: orderedKeys.reduce((sum, key) => sum + points[key].y, 0) / orderedKeys.length,
    };
  }

  cx /= (6.0 * signedArea);
  cy /= (6.0 * signedArea);

  return { x: cx, y: cy };
};

export const scalePolygon = (
  points: RoomPoints,
  orderedKeys: CornerKey[],
  centroid: RoomPoint,
  scaleFactor: number
): RoomPoints => {
  const scaled: Partial<RoomPoints> = {};
  for (const key of Object.keys(points) as CornerKey[]) {
    if (orderedKeys.includes(key)) {
      const p = points[key];
      scaled[key] = {
        x: centroid.x + (p.x - centroid.x) * scaleFactor,
        y: centroid.y + (p.y - centroid.y) * scaleFactor,
      };
    } else {
      scaled[key] = { ...points[key] };
    }
  }
  return scaled as RoomPoints;
};

export const calculatePolygonSignedArea = (points: RoomPoints, orderedKeys: CornerKey[]): number => {
  if (orderedKeys.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < orderedKeys.length; i += 1) {
    const p1 = points[orderedKeys[i]];
    const p2 = points[orderedKeys[(i + 1) % orderedKeys.length]];
    area += p1.x * p2.y - p2.x * p1.y;
  }

  return area / 2;
};

export const findNearestBoundarySegment = (
  target: RoomPoint,
  points: RoomPoints,
  orderedKeys: CornerKey[]
): BoundarySegmentProjection | null => {
  if (orderedKeys.length < 2) return null;

  let nearest: BoundarySegmentProjection | null = null;

  for (let i = 0; i < orderedKeys.length; i += 1) {
    const start = points[orderedKeys[i]];
    const end = points[orderedKeys[(i + 1) % orderedKeys.length]];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared < EPSILON) {
      continue;
    }

    const rawT = ((target.x - start.x) * dx + (target.y - start.y) * dy) / lengthSquared;
    const t = Math.max(0, Math.min(1, rawT));
    const closestPoint = {
      x: start.x + dx * t,
      y: start.y + dy * t,
    };
    const diffX = target.x - closestPoint.x;
    const diffY = target.y - closestPoint.y;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);

    if (!nearest || distance < nearest.distance) {
      nearest = {
        segmentIndex: i,
        distance,
        t,
        closestPoint,
      };
    }
  }

  return nearest;
};

export const buildRoadPolygonFromPlacement = (
  points: RoomPoints,
  orderedKeys: CornerKey[],
  placement: RoadPlacement
): RoadPolygonResult | null => {
  if (orderedKeys.length < 2) return null;
  if (placement.segmentIndex < 0 || placement.segmentIndex >= orderedKeys.length) return null;

  const start = points[orderedKeys[placement.segmentIndex]];
  const end = points[orderedKeys[(placement.segmentIndex + 1) % orderedKeys.length]];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const segmentLength = Math.sqrt(dx * dx + dy * dy);

  if (segmentLength < EPSILON) return null;

  const tangentX = dx / segmentLength;
  const tangentY = dy / segmentLength;
  const signedArea = calculatePolygonSignedArea(points, orderedKeys);

  // For CCW polygons interior is on the left side of each edge, so outward is right.
  const outwardX = signedArea >= 0 ? tangentY : -tangentY;
  const outwardY = signedArea >= 0 ? -tangentX : tangentX;

  const clampedT = Math.max(0, Math.min(1, placement.t));
  const anchor = {
    x: start.x + dx * clampedT,
    y: start.y + dy * clampedT,
  };

  const halfWidth = placement.width / 2;
  const halfLength = placement.length / 2;
  const center = {
    x: anchor.x + outwardX * (placement.gap + halfWidth),
    y: anchor.y + outwardY * (placement.gap + halfWidth),
  };

  const alongX = tangentX * halfLength;
  const alongY = tangentY * halfLength;
  const normalX = outwardX * halfWidth;
  const normalY = outwardY * halfWidth;

  const polygon = [
    { x: center.x - alongX - normalX, y: center.y - alongY - normalY },
    { x: center.x + alongX - normalX, y: center.y + alongY - normalY },
    { x: center.x + alongX + normalX, y: center.y + alongY + normalY },
    { x: center.x - alongX + normalX, y: center.y - alongY + normalY },
  ];

  return { polygon };
};
