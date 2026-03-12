import client from "./client";
import type { Coordinate } from "../components/Konva/shapes/types";

// response shape returned by the formatting algorithm
export interface FormatResponse {
  merged_horiz: Record<string, [number, number][][]>;
  merged_vert: Record<string, [number, number][][]>;
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

