import type { Polygon } from "./geometry";
import type { ProjectArea, ProjectLength } from "./measurement";

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
  baseSetback: ProjectLength;
  roadAdjustment: ProjectLength;
  finalSetback: ProjectLength;
  roadType: RoadType | null;
}

export interface BuildableLand {
  boundary: Polygon;
  area: ProjectArea;
  edgeSetbacks: EdgeSetback[];
}

export interface UsableLand {
  boundary: Polygon;
  width: ProjectLength;
  length: ProjectLength;
  area: ProjectArea;
  floorWidthAlignment: FloorWidthAlignment;
  entryRoadEdgeIndex: number;
}

export interface BuildableSpaceResult {
  flowId: string;
  projectUnitsPerMeter: number;
  originalLandArea: ProjectArea;
  buildableLand: BuildableLand;
  usableLand: UsableLand;
  referenceProfile: string;
}
