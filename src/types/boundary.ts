import type { Polygon } from "./geometry";

export const ROAD_ROLES = ["main_entry"] as const;
export type RoadRole = (typeof ROAD_ROLES)[number];

export const ROAD_TYPES = ["main_road", "private_road"] as const;
export type RoadType = (typeof ROAD_TYPES)[number];

export const BOUNDARY_SIDES = ["front", "back", "left", "right"] as const;
export type BoundarySide = (typeof BOUNDARY_SIDES)[number];

export const FLOOR_WIDTH_ALIGNMENTS = [
  "parallel_to_entry_road",
  "perpendicular_to_entry_road",
] as const;
export type FloorWidthAlignment = (typeof FLOOR_WIDTH_ALIGNMENTS)[number];

export interface RoadAttachment {
  boundaryEdgeIndex: number;
  role: RoadRole;
  roadType: RoadType;
}

export interface BuildableSpaceRequest {
  landBoundary: Polygon;
  roads: RoadAttachment[];
}

export interface EdgeSetback {
  edgeIndex: number;
  side: BoundarySide;
  baseSetback: number;
  roadAdjustment: number;
  finalSetback: number;
  roadType: RoadType | null;
}

export interface BuildableLand {
  boundary: Polygon;
  area: number;
  edgeSetbacks: EdgeSetback[];
}

export interface UsableLand {
  boundary: Polygon;
  width: number;
  length: number;
  area: number;
  floorWidthAlignment: FloorWidthAlignment;
  entryRoadEdgeIndex: number;
}

export interface BuildableSpaceResult {
  flowId: string;
  projectUnitsPerMeter: number;
  originalLandArea: number;
  buildableLand: BuildableLand;
  usableLand: UsableLand;
  referenceProfile: string;
}
