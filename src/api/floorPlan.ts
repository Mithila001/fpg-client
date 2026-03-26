import client from "./client";
import type { Coordinate, Label } from "../components/Konva/shapes/types";

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// rooms returned alongside wall geometry
export interface Room {
  name: string;
  type: string;
  center: Point;
}

export type PlanStatus = "FEASIBLE" | "INFEASIBLE" | "ERROR" | string;

// response shape returned by the backend solver
export interface FormatResponse {
  status: PlanStatus;
  message: string;
  walls: Wall[];
  rooms?: Room[];
}

// call the backend formatter endpoint and only accept feasible plans
export async function fetchFormattedPlan(): Promise<FormatResponse> {
  const response = await client.get<FormatResponse>("/algorithms/format");
  const data = response.data;

  if (data.status !== "FEASIBLE") {
    throw new Error(data.message || `Plan status is ${data.status}`);
  }

  return data;
}

// convert response walls into 2-point polyline segments for Konva
export function formatResponseToSegments(resp: FormatResponse): Coordinate[][] {
  return (resp.walls ?? []).map((wall) => [
    { x: wall.x1, y: wall.y1 },
    { x: wall.x2, y: wall.y2 },
  ]);
}

// extract text labels from rooms returned by the service
export function roomsToLabels(rooms?: Room[]): Label[] {
  if (!rooms) return [];
  return rooms.map((room) => ({
    x: room.center.x,
    y: room.center.y,
    text: room.name,
  }));
}

