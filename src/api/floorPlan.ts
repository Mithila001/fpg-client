import client from "./client";
import type { Coordinate, Label } from "../components/Konva/shapes/types";
import { apiRawToCm } from "../utils/units";
import type {
  CompactByRoom,
  CompactOpening,
  FormatResponse,
  Point,
  Wall,
  CanvasOpening,
  OpeningKind,
} from "../types";
import { getRoomCenterFromWalls } from "../utils/roomGeometry";

const normalizeWallToCm = (wall: Wall): Wall => ({
  x1: apiRawToCm(wall.x1),
  y1: apiRawToCm(wall.y1),
  x2: apiRawToCm(wall.x2),
  y2: apiRawToCm(wall.y2),
});

const normalizeOpeningToCm = (opening: CompactOpening): CompactOpening => ({
  ...opening,
  x1: apiRawToCm(opening.x1),
  y1: apiRawToCm(opening.y1),
  x2: apiRawToCm(opening.x2),
  y2: apiRawToCm(opening.y2),
});

const normalizeCompactByRoomToCm = (compactByRoom?: CompactByRoom): CompactByRoom | undefined => {
  if (!compactByRoom) return undefined;

  const normalized: CompactByRoom = {};
  for (const [roomKey, room] of Object.entries(compactByRoom)) {
    normalized[roomKey] = {
      ...room,
      walls: (room.walls ?? []).map(normalizeWallToCm),
      openings: (room.openings ?? []).map(normalizeOpeningToCm),
    };
  }

  return normalized;
};

const openingTypeToKind = (openingType: string): OpeningKind => {
  return openingType.toLowerCase().includes("window") ? "window" : "door";
};

const openingKey = (opening: CompactOpening): string => {
  const a = `${opening.x1.toFixed(3)}:${opening.y1.toFixed(3)}`;
  const b = `${opening.x2.toFixed(3)}:${opening.y2.toFixed(3)}`;
  const endpoints = [a, b].sort().join("|");
  return `${opening.opening_type}|${endpoints}`;
};

// Normalize backend payload values to internal centimeters.
export function normalizeApiResponseToCm(resp: FormatResponse): FormatResponse {
  return {
    ...resp,
    walls: (resp.walls ?? []).map(normalizeWallToCm),
    compact_by_room: normalizeCompactByRoomToCm(resp.compact_by_room),
  };
}

// call the backend formatter endpoint and only accept feasible plans
export async function fetchFormattedPlan(): Promise<FormatResponse> {
  const response = await client.get<FormatResponse>("/algorithms/format");
  const data = response.data;

  if (data.status !== "FEASIBLE") {
    throw new Error(data.message || `Plan status is ${data.status}`);
  }

  return normalizeApiResponseToCm(data);
}

export interface FormatV2Request {
  floor_width: number;
  floor_height: number;
  room_template: {
    name: string;
    data: Array<{ id: string; type: string }>;
  };
  should_optuna_run: boolean;
  optuna_trial_count: number;
}

export async function formatFloorPlanV2(request: FormatV2Request): Promise<FormatResponse> {
  const response = await client.post<FormatResponse>("/algorithms/format/v2", request);
  const data = response.data;

  if (data.status !== "FEASIBLE") {
    throw new Error(data.message || `Plan status is ${data.status}`);
  }

  return normalizeApiResponseToCm(data);
}

// convert response walls into 2-point polyline segments for Konva
export function formatResponseToSegments(resp: FormatResponse): Coordinate[][] {
  return (resp.walls ?? []).map((wall) => [
    { x: wall.x1, y: wall.y1 },
    { x: wall.x2, y: wall.y2 },
  ]);
}

export function roomCentersFromCompactByRoom(resp: FormatResponse): Coordinate[] {
  if (!resp.compact_by_room) return [];

  const centers: Coordinate[] = [];
  for (const room of Object.values(resp.compact_by_room)) {
    const center: Point | null = getRoomCenterFromWalls(room);
    if (!center) continue;

    centers.push({
      x: center.x,
      y: center.y,
      label: room.room_name,
    });
  }

  return centers;
}

export function compactRoomsToLabels(resp: FormatResponse): Label[] {
  return roomCentersFromCompactByRoom(resp).map((center) => ({
    x: center.x,
    y: center.y,
    text: center.label ?? "Room",
  }));
}

export function compactRoomsToOpenings(resp: FormatResponse): CanvasOpening[] {
  const compactByRoom = resp.compact_by_room;
  if (!compactByRoom) return [];

  const dedupe = new Set<string>();
  const openings: CanvasOpening[] = [];

  for (const room of Object.values(compactByRoom)) {
    for (const opening of room.openings ?? []) {
      const key = openingKey(opening);
      if (dedupe.has(key)) continue;
      dedupe.add(key);

      openings.push({
        x1: opening.x1,
        y1: opening.y1,
        x2: opening.x2,
        y2: opening.y2,
        kind: openingTypeToKind(opening.opening_type),
        openingType: opening.opening_type,
        side: opening.side,
        roomName: opening.room_name,
        roomType: opening.room_type,
        connectedRoomName: opening.connected_room_name,
        connectedRoomType: opening.connected_room_type,
      });
    }
  }

  return openings;
}

export type { FormatResponse } from "../types";

