import type { RoomPoint, RoomPoints } from "../InputPlanCanvas";
import type { CornerKey } from "../InputPlanCanvas";

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
