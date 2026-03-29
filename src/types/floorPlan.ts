export type PlanStatus = "FEASIBLE" | "INFEASIBLE" | "ERROR" | string;

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

export interface CompactOpening {
  room_name: string;
  room_type: string;
  opening_type: string;
  side: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  connected_room_name: string | null;
  connected_room_type: string | null;
}

export interface CompactRoom {
  room_name: string;
  room_type: string;
  walls: Wall[];
  openings: CompactOpening[];
}

export type CompactByRoom = Record<string, CompactRoom>;

export interface FormatResponse {
  status: PlanStatus;
  message: string;
  walls: Wall[];
  compact_by_room?: CompactByRoom;
}
