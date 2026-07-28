import { PROJECT_UNITS_PER_METER } from "../../measurement";
import type {
  BuildableSpaceRequest as AppBuildableSpaceRequest,
  BuildableSpaceResult,
  EdgeSetback,
  Point,
  Polygon,
} from "../../types";
import {
  API_PROJECT_UNITS_PER_METER,
  apiAreaToProjectArea,
  apiLengthToProjectLength,
  projectAreaToApiArea,
  projectLengthToApiLength,
} from "../measurement";
import type {
  BuildableSpaceRequest as ApiBuildableSpaceRequest,
  BuildableSpaceResponse as ApiBuildableSpaceResponse,
  EdgeSetbackResponse as ApiEdgeSetbackResponse,
  PointResponse as ApiPoint,
  PolygonResponse as ApiPolygon,
} from "./boundary.api.types";

const toApiPoint = (
  point: Point,
  apiUnitsPerMeter: number,
): ApiPoint => ({
  x: projectLengthToApiLength(point.x, apiUnitsPerMeter),
  y: projectLengthToApiLength(point.y, apiUnitsPerMeter),
});

const fromApiPoint = (
  point: ApiPoint,
  apiUnitsPerMeter: number,
): Point => ({
  x: apiLengthToProjectLength(point.x, apiUnitsPerMeter),
  y: apiLengthToProjectLength(point.y, apiUnitsPerMeter),
});

const toApiPolygon = (
  polygon: Polygon,
  apiUnitsPerMeter: number,
): ApiPolygon => ({
  points: polygon.points.map((point) =>
    toApiPoint(point, apiUnitsPerMeter),
  ),
});

const fromApiPolygon = (
  polygon: ApiPolygon,
  apiUnitsPerMeter: number,
): Polygon => ({
  points: polygon.points.map((point) =>
    fromApiPoint(point, apiUnitsPerMeter),
  ),
});

const toApiEdgeSetback = (
  setback: EdgeSetback,
  apiUnitsPerMeter: number,
): ApiEdgeSetbackResponse => ({
  edge_index: setback.edgeIndex,
  side: setback.side,
  base_setback: projectLengthToApiLength(
    setback.baseSetback,
    apiUnitsPerMeter,
  ),
  road_adjustment: projectLengthToApiLength(
    setback.roadAdjustment,
    apiUnitsPerMeter,
  ),
  final_setback: projectLengthToApiLength(
    setback.finalSetback,
    apiUnitsPerMeter,
  ),
  road_type: setback.roadType,
});

const fromApiEdgeSetback = (
  setback: ApiEdgeSetbackResponse,
  apiUnitsPerMeter: number,
): EdgeSetback => ({
  edgeIndex: setback.edge_index,
  side: setback.side,
  baseSetback: apiLengthToProjectLength(
    setback.base_setback,
    apiUnitsPerMeter,
  ),
  roadAdjustment: apiLengthToProjectLength(
    setback.road_adjustment,
    apiUnitsPerMeter,
  ),
  finalSetback: apiLengthToProjectLength(
    setback.final_setback,
    apiUnitsPerMeter,
  ),
  roadType: setback.road_type,
});

export const toBuildableSpaceApiRequest = (
  request: AppBuildableSpaceRequest,
): ApiBuildableSpaceRequest => ({
  land_boundary: {
    points: request.landBoundary.points.map((point) =>
      toApiPoint(point, API_PROJECT_UNITS_PER_METER),
    ),
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
    points: request.land_boundary.points.map((point) =>
      fromApiPoint(point, API_PROJECT_UNITS_PER_METER),
    ),
  },
  roads: request.roads.map((road) => ({
    boundaryEdgeIndex: road.boundary_edge_index,
    role: road.role,
    roadType: road.road_type,
  })),
});

export const fromBuildableSpaceApiResponse = (
  response: ApiBuildableSpaceResponse,
): BuildableSpaceResult => {
  const apiUnitsPerMeter = response.units.project_units_per_meter;

  return {
    flowId: response.flow_id,
    projectUnitsPerMeter: PROJECT_UNITS_PER_METER,
    originalLandArea: apiAreaToProjectArea(
      response.original_land.area,
      apiUnitsPerMeter,
    ),
    buildableLand: {
      boundary: fromApiPolygon(
        response.buildable_land.boundary,
        apiUnitsPerMeter,
      ),
      area: apiAreaToProjectArea(
        response.buildable_land.area,
        apiUnitsPerMeter,
      ),
      edgeSetbacks: response.buildable_land.edge_setbacks.map((setback) =>
        fromApiEdgeSetback(setback, apiUnitsPerMeter),
      ),
    },
    usableLand: {
      boundary: fromApiPolygon(response.usable_land.boundary, apiUnitsPerMeter),
      width: apiLengthToProjectLength(
        response.usable_land.width,
        apiUnitsPerMeter,
      ),
      length: apiLengthToProjectLength(
        response.usable_land.length,
        apiUnitsPerMeter,
      ),
      area: apiAreaToProjectArea(
        response.usable_land.area,
        apiUnitsPerMeter,
      ),
      floorWidthAlignment: response.usable_land.floor_width_alignment,
      entryRoadEdgeIndex: response.usable_land.entry_road_edge_index,
    },
    referenceProfile: response.reference_profile,
  };
};

export const toBuildableSpaceApiResponse = (
  result: BuildableSpaceResult,
): ApiBuildableSpaceResponse => {
  const apiUnitsPerMeter = API_PROJECT_UNITS_PER_METER;

  return {
    flow_id: result.flowId,
    units: {
      project_units_per_meter: apiUnitsPerMeter,
    },
    original_land: {
      area: projectAreaToApiArea(result.originalLandArea, apiUnitsPerMeter),
    },
    buildable_land: {
      boundary: toApiPolygon(result.buildableLand.boundary, apiUnitsPerMeter),
      area: projectAreaToApiArea(
        result.buildableLand.area,
        apiUnitsPerMeter,
      ),
      edge_setbacks: result.buildableLand.edgeSetbacks.map((setback) =>
        toApiEdgeSetback(setback, apiUnitsPerMeter),
      ),
    },
    usable_land: {
      boundary: toApiPolygon(result.usableLand.boundary, apiUnitsPerMeter),
      width: projectLengthToApiLength(
        result.usableLand.width,
        apiUnitsPerMeter,
      ),
      length: projectLengthToApiLength(
        result.usableLand.length,
        apiUnitsPerMeter,
      ),
      area: projectAreaToApiArea(result.usableLand.area, apiUnitsPerMeter),
      floor_width_alignment: result.usableLand.floorWidthAlignment,
      entry_road_edge_index: result.usableLand.entryRoadEdgeIndex,
    },
    reference_profile: result.referenceProfile,
  };
};
