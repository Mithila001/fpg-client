export type RoadRole = "main_entry";
export type RoadType = "main_road" | "private_road";
export type BoundarySide = "front" | "back" | "left" | "right";
export type FloorWidthAlignment =
  | "parallel_to_entry_road"
  | "perpendicular_to_entry_road";

export interface LandPointRequest {
  x: number;
  y: number;
}

export interface LandBoundaryRequest {
  points: LandPointRequest[];
}

export interface RoadAttachmentRequest {
  boundary_edge_index: number;
  role: RoadRole;
  road_type: RoadType;
}

export interface BuildableSpaceRequest {
  land_boundary: LandBoundaryRequest;
  roads: RoadAttachmentRequest[];
}

export interface PointResponse {
  x: number;
  y: number;
}

export interface PolygonResponse {
  points: PointResponse[];
}

export interface EdgeSetbackResponse {
  edge_index: number;
  side: BoundarySide;
  base_setback: number;
  road_adjustment: number;
  final_setback: number;
  road_type: RoadType | null;
}

export interface BuildableSpaceResponse {
  flow_id: string;
  units: {
    project_units_per_meter: number;
  };
  original_land: {
    area: number;
  };
  buildable_land: {
    boundary: PolygonResponse;
    area: number;
    edge_setbacks: EdgeSetbackResponse[];
  };
  usable_land: {
    boundary: PolygonResponse;
    width: number;
    length: number;
    area: number;
    floor_width_alignment: FloorWidthAlignment;
    entry_road_edge_index: number;
  };
  reference_profile: string;
}

export type BuildableSpaceErrorStage =
  | "request_validation"
  | "reference_data"
  | "buildable_land"
  | "usable_land"
  | "response";

export type BuildableSpaceErrorCode =
  | "invalid_request"
  | "invalid_land_boundary"
  | "non_convex_land"
  | "self_intersecting_land"
  | "invalid_road_attachment"
  | "multiple_main_entry_roads"
  | "unsupported_road_type"
  | "reference_data_error"
  | "setback_eliminates_buildable_land"
  | "buildable_land_calculation_failed"
  | "no_usable_land_found"
  | "search_limit_exceeded"
  | "usable_land_calculation_failed"
  | "unexpected_buildable_space_error";

export interface BuildableSpaceErrorResponse {
  flow_id: string;
  stage: BuildableSpaceErrorStage;
  code: BuildableSpaceErrorCode;
  message: string;
  details: Record<string, unknown>;
}
