export type PlanStatus = "FEASIBLE" | "INFEASIBLE" | "ERROR" | string;

export type JobStatus = "SEARCHING" | "COMPLETED" | "TERMINATED" | "TIMED_OUT" | string;

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

export interface OpeningData {
  room_name: string;
  opening_type: string;
  side: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  connected_room_name: string | null;
}

export interface ProcessedRoomData {
  type: string;
  name: string;
  area: number;
  vertices: Array<[number, number]>;
}

export interface UnifiedFloorPlan {
  walls: Wall[];
  total_wall_length: number;
}

export interface FloorPlanWithOpenings {
  floor_plan: ProcessedRoomData[];
  openings: OpeningData[];
}

export interface FormatV2Result {
  status: PlanStatus;
  message: string;
  score: number;
  union_results: {
    floor_plan_with_openings: FloorPlanWithOpenings;
    unified_floor_plan: UnifiedFloorPlan;
  };
}

export interface JobEventPayload {
  id?: number;
  event?: string;
  message?: string;
  timestamp?: string;
  data?: unknown;
}

export interface JobStateResponse<T = unknown> {
  job_id: string;
  status: JobStatus;
  result: T | null;
  events: JobEventPayload[];
  current_best_score: number | null;
}
