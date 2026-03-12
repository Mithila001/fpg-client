import client from "./client";
import type { Coordinate, Label } from "../components/Konva/shapes/types";

export interface WallSegment {
  start: [number, number];
  end: [number, number];
}

export interface Room {
  name: string;
  type: string;
  center: [number, number];
}

export interface FloorPlan {
  walls: WallSegment[];
  rooms: Room[];
}

export async function fetchFloorPlan(): Promise<FloorPlan> {
  const response = await client.get<FloorPlan>("/dev/formatter-floor-plan");
  return response.data;
}

// the raw layout endpoint uses the same response format
// the raw layout endpoint returns polygons instead of wall segments
interface RawFloorPlan {
  polygons: [number, number][][];
  rooms: Room[];
}

export async function fetchRawFloorPlan(): Promise<FloorPlan> {
  const response = await client.get<RawFloorPlan>("/dev/raw-floor-plan");
  const raw = response.data;

  // convert polygons to wall segments by walking each polygon boundary
  const walls: WallSegment[] = [];
  raw.polygons.forEach((poly) => {
    for (let i = 0; i < poly.length; i++) {
      const start = poly[i];
      const end = poly[(i + 1) % poly.length];
      walls.push({ start: [start[0], start[1]], end: [end[0], end[1]] });
    }
  });

  return {
    walls,
    rooms: raw.rooms,
  };
}

export function wallsToPoints(walls: WallSegment[]): Coordinate[] {
  if (walls.length === 0) return [];
  const points: Coordinate[] = [];
  walls.forEach((wall) => {
    points.push({ x: wall.start[0], y: wall.start[1] });
  });
  // close by adding the end of the last wall
  const last = walls[walls.length - 1];
  points.push({ x: last.end[0], y: last.end[1] });
  return points;
}

export function roomsToLabels(rooms: Room[]): Label[] {
  return rooms.map((room) => ({
    x: room.center[0],
    y: room.center[1],
    text: room.name,
  }));
}
