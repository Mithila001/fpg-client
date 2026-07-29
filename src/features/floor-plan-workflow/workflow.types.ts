import type { GenerationRoom, RoomType } from "../../types";

export interface RoomRequirementSelection {
  roomType: RoomType;
  count: number;
  size: string;
  required: boolean;
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
  flowId?: string;
}

export type WorkflowActivity =
  | "idle"
  | "loading-constraints"
  | "finding-buildable-space"
  | "generating"
  | "cancelling";
