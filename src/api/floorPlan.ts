import client from "./client";
import type { Coordinate, Label } from "../components/Konva/shapes/types";
import type {
  CanvasOpening,
  FormatV2Result,
  JobStateResponse,
  OpeningData,
  ProcessedRoomData,
  Wall,
} from "../types";
import { fetchJobState } from "./jobs";

export interface FormatV2Request {
  floor_width: number;
  floor_height: number;
  aspect_ratio?: number | string;
  room_template: {
    name: string;
    data: Array<{ type: string; size: string; name?: string }>;
  };
  should_optuna_run?: boolean;
  optuna_trial_count?: number;
}

export interface FormatV2JobSubmission {
  job_id: string;
  status: string;
  message: string;
}

export const submitFormatV2Job = async (
  request: FormatV2Request,
): Promise<FormatV2JobSubmission> => {
  const response = await client.post<FormatV2JobSubmission>("/algorithms/format/v2", request);
  return response.data;
};

export const fetchFormatV2JobState = async (
  jobId: string,
): Promise<JobStateResponse<FormatV2Result>> => {
  return fetchJobState<FormatV2Result>(jobId);
};

const openingTypeToKind = (openingType: string): "window" | "door" => {
  return openingType.toLowerCase().includes("window") ? "window" : "door";
};

const centroidFromVertices = (vertices: Array<[number, number]>): Coordinate | null => {
  if (vertices.length === 0) return null;

  let signedArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < vertices.length; i += 1) {
    const [x0, y0] = vertices[i];
    const [x1, y1] = vertices[(i + 1) % vertices.length];
    const cross = x0 * y1 - x1 * y0;
    signedArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  if (signedArea === 0) {
    const total = vertices.reduce((acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }), {
      x: 0,
      y: 0,
    });
    return {
      x: total.x / vertices.length,
      y: total.y / vertices.length,
    };
  }

  const area = signedArea * 0.5;
  return {
    x: cx / (6 * area),
    y: cy / (6 * area),
  };
};

const roomsFromResult = (result: FormatV2Result): ProcessedRoomData[] => {
  return result.union_results.floor_plan_with_openings.floor_plan ?? [];
};

const openingsFromResult = (result: FormatV2Result): OpeningData[] => {
  return result.union_results.floor_plan_with_openings.openings ?? [];
};

const wallsFromResult = (result: FormatV2Result): Wall[] => {
  return result.union_results.unified_floor_plan.walls ?? [];
};

export const formatResultToSegments = (result: FormatV2Result): Coordinate[][] => {
  return wallsFromResult(result).map((wall) => [
    { x: wall.x1, y: wall.y1 },
    { x: wall.x2, y: wall.y2 },
  ]);
};

export const roomCentersFromResult = (result: FormatV2Result): Coordinate[] => {
  const centers: Coordinate[] = [];

  roomsFromResult(result).forEach((room) => {
    const center = centroidFromVertices(room.vertices);
    if (!center) return;

    centers.push({
      x: center.x,
      y: center.y,
      label: room.name,
    });
  });

  return centers;
};

export const roomsToLabels = (result: FormatV2Result): Label[] => {
  return roomCentersFromResult(result).map((center) => ({
    x: center.x,
    y: center.y,
    text: center.label ?? "Room",
  }));
};

export const roomsToOpenings = (result: FormatV2Result): CanvasOpening[] => {
  return openingsFromResult(result).map((opening) => ({
    x1: opening.x1,
    y1: opening.y1,
    x2: opening.x2,
    y2: opening.y2,
    kind: openingTypeToKind(opening.opening_type),
    openingType: opening.opening_type,
    side: opening.side,
    roomName: opening.room_name,
    roomType: null,
    connectedRoomName: opening.connected_room_name ?? null,
    connectedRoomType: null,
  }));
};
