import type { GenerationRoom, RoomType } from "../../types";

export interface RoomRequirementSelection {
  roomType: RoomType;
  count: number;
  size: string;
}

export interface FloorPlanRequirements {
  floorWidth: number;
  floorLength: number;
  rooms: GenerationRoom[];
  selections: RoomRequirementSelection[];
  summary: string;
}

export type WorkflowTab = "land" | "generate";

export interface WorkflowErrorInfo {
  message: string;
  code?: string;
  stage?: string;
  flowId?: string;
  details?: unknown;
}

export type WorkflowActivity =
  | "idle"
  | "loading-metadata"
  | "finding-buildable-space"
  | "generating"
  | "cancelling";
