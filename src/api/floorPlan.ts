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
import { formatRoomName } from "../utils/text";

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

export const FPG_TRIAL_COUNT = 1000;

export const submitFormatV2Job = async (
  request: FormatV2Request,
): Promise<FormatV2JobSubmission> => {
  const payload = {
    ...request,
    optuna_trial_count: FPG_TRIAL_COUNT,
  };
  const response = await client.post<FormatV2JobSubmission>("/algorithms/format/v2", payload);
  return response.data;
};

export const fetchFormatV2JobState = async (
  jobId: string,
): Promise<JobStateResponse<FormatV2Result>> => {
  const state = await fetchJobState<unknown>(jobId);

  const nestedResult =
    state.result && typeof state.result === "object" && "result" in state.result
      ? (state.result as { result?: unknown }).result
      : undefined;

  if (nestedResult && typeof nestedResult === "object" && "union_results" in nestedResult) {
    state.result = nestedResult;
  }

  if (!state.result && state.events && Array.isArray(state.events)) {
    const successEvent = state.events.find((e) => e.event === "success");
    const successData =
      successEvent && typeof successEvent.data === "object" && successEvent.data !== null
        ? (successEvent.data as { result?: FormatV2Result })
        : undefined;
    if (successData?.result) {
      state.result = successData.result;
      state.status = "COMPLETED"; // Force status to COMPLETED if success event exists
    }
  }

  return state as JobStateResponse<FormatV2Result>;
};

const openingTypeToKind = (openingType: string): "window" | "door" => {
  return openingType.toLowerCase().includes("window") ? "window" : "door";
};

const centroidFromVertices = (vertices: Array<unknown>): Coordinate | null => {
  if (!vertices || vertices.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const v of vertices) {
    let x: unknown;
    let y: unknown;
    if (Array.isArray(v)) {
      [x, y] = v;
    } else if (v && typeof v === "object") {
      const point = v as { x?: unknown; y?: unknown };
      x = point.x;
      y = point.y;
    }
    if (typeof x === "number" && typeof y === "number") {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (minX === Infinity) return null;

  return {
    x: minX + (maxX - minX) / 2,
    y: minY + (maxY - minY) / 2,
  };
};

export const roomsFromResult = (result: FormatV2Result): ProcessedRoomData[] => {
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
      label: formatRoomName(room.name, room.type),
    });
  });

  return centers;
};

export const roomsToLabels = (result: FormatV2Result): Label[] => {
  return roomCentersFromResult(result).map((center) => ({
    x: center.x * 10,
    y: center.y * 10,
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
