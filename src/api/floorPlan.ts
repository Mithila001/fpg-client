import client from "./client";
import type { Coordinate, Label } from "../components/Konva/shapes/types";

// rooms returned alongside the formatted lines (new in backend API)
export interface Room {
  name: string;
  center: [number, number];
}

// response shape returned by the formatting algorithm
export interface FormatResponse {
  merged_horiz: Record<string, [number, number][][]>;
  merged_vert: Record<string, [number, number][][]>;
  rooms?: Room[]; // optional, may not have been included previously
}

// call the backend formatter endpoint and return the raw data
export async function fetchFormattedPlan(): Promise<FormatResponse> {
  const response = await client.get<FormatResponse>("/algorithms/format");
  return response.data;
}

// convert a FormatResponse into an array of polyline segments
export function formatResponseToSegments(resp: FormatResponse): Coordinate[][] {
  const segments: Coordinate[][] = [];

  const convert = (map: Record<string, [number, number][][]>) => {
    Object.values(map).forEach((polylines) => {
      polylines.forEach((poly) => {
        const coords: Coordinate[] = poly.map((pt) => ({ x: pt[0], y: pt[1] }));
        if (coords.length > 0) segments.push(coords);
      });
    });
  };

  convert(resp.merged_horiz);
  convert(resp.merged_vert);

  return segments;
}

// extract text labels from rooms returned by the service
export function roomsToLabels(rooms?: Room[]): Label[] {
  if (!rooms) return [];
  return rooms.map((room) => ({
    x: room.center[0],
    y: room.center[1],
    text: room.name,
  }));
}

