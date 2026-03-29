import type { CompactRoom, Point } from "../types";

const toPoints = (room: CompactRoom): Point[] => {
  const points: Point[] = [];
  for (const wall of room.walls ?? []) {
    points.push({ x: wall.x1, y: wall.y1 });
    points.push({ x: wall.x2, y: wall.y2 });
  }
  return points;
};

export const getBoundingBoxCenter = (points: Point[]): Point | null => {
  if (points.length === 0) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
};

export const getRoomCenterFromWalls = (room: CompactRoom): Point | null => {
  return getBoundingBoxCenter(toPoints(room));
};
