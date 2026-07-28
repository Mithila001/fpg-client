import type {
  BuildableSpaceRequest as AppBuildableSpaceRequest,
  BuildableSpaceResult,
  EdgeSetback,
  Point,
  Polygon,
} from "../../types";
import type {
  BuildableSpaceRequest as ApiBuildableSpaceRequest,
  BuildableSpaceResponse as ApiBuildableSpaceResponse,
  EdgeSetbackResponse as ApiEdgeSetbackResponse,
  PointResponse as ApiPoint,
  PolygonResponse as ApiPolygon,
} from "./boundary.api.types";

const toApiPoint = (point: Point): ApiPoint => ({
  x: point.x,
  y: point.y,
});

const fromApiPoint = (point: ApiPoint): Point => ({
  x: point.x,
  y: point.y,
});

const toApiPolygon = (polygon: Polygon): ApiPolygon => ({
  points: polygon.points.map(toApiPoint),
});

const fromApiPolygon = (polygon: ApiPolygon): Polygon => ({
  points: polygon.points.map(fromApiPoint),
});

const toApiEdgeSetback = (setback: EdgeSetback): ApiEdgeSetbackResponse => ({
  edge_index: setback.edgeIndex,
  side: setback.side,
  base_setback: setback.baseSetback,
  road_adjustment: setback.roadAdjustment,
  final_setback: setback.finalSetback,
  road_type: setback.roadType,
});

const fromApiEdgeSetback = (setback: ApiEdgeSetbackResponse): EdgeSetback => ({
  edgeIndex: setback.edge_index,
  side: setback.side,
  baseSetback: setback.base_setback,
  roadAdjustment: setback.road_adjustment,
  finalSetback: setback.final_setback,
  roadType: setback.road_type,
});

export const toBuildableSpaceApiRequest = (
  request: AppBuildableSpaceRequest,
): ApiBuildableSpaceRequest => ({
  land_boundary: {
    points: request.landBoundary.points.map(toApiPoint),
  },
  roads: request.roads.map((road) => ({
    boundary_edge_index: road.boundaryEdgeIndex,
    role: road.role,
    road_type: road.roadType,
  })),
});

export const fromBuildableSpaceApiRequest = (
  request: ApiBuildableSpaceRequest,
): AppBuildableSpaceRequest => ({
  landBoundary: {
    points: request.land_boundary.points.map(fromApiPoint),
  },
  roads: request.roads.map((road) => ({
    boundaryEdgeIndex: road.boundary_edge_index,
    role: road.role,
    roadType: road.road_type,
  })),
});

export const fromBuildableSpaceApiResponse = (
  response: ApiBuildableSpaceResponse,
): BuildableSpaceResult => ({
  flowId: response.flow_id,
  projectUnitsPerMeter: response.units.project_units_per_meter,
  originalLandArea: response.original_land.area,
  buildableLand: {
    boundary: fromApiPolygon(response.buildable_land.boundary),
    area: response.buildable_land.area,
    edgeSetbacks: response.buildable_land.edge_setbacks.map(fromApiEdgeSetback),
  },
  usableLand: {
    boundary: fromApiPolygon(response.usable_land.boundary),
    width: response.usable_land.width,
    length: response.usable_land.length,
    area: response.usable_land.area,
    floorWidthAlignment: response.usable_land.floor_width_alignment,
    entryRoadEdgeIndex: response.usable_land.entry_road_edge_index,
  },
  referenceProfile: response.reference_profile,
});

export const toBuildableSpaceApiResponse = (
  result: BuildableSpaceResult,
): ApiBuildableSpaceResponse => ({
  flow_id: result.flowId,
  units: {
    project_units_per_meter: result.projectUnitsPerMeter,
  },
  original_land: {
    area: result.originalLandArea,
  },
  buildable_land: {
    boundary: toApiPolygon(result.buildableLand.boundary),
    area: result.buildableLand.area,
    edge_setbacks: result.buildableLand.edgeSetbacks.map(toApiEdgeSetback),
  },
  usable_land: {
    boundary: toApiPolygon(result.usableLand.boundary),
    width: result.usableLand.width,
    length: result.usableLand.length,
    area: result.usableLand.area,
    floor_width_alignment: result.usableLand.floorWidthAlignment,
    entry_road_edge_index: result.usableLand.entryRoadEdgeIndex,
  },
  reference_profile: result.referenceProfile,
});
