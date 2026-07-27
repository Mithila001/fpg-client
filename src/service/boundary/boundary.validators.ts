import { BoundaryServiceError } from "./boundary.errors";
import type {
  BoundarySide,
  BuildableSpaceErrorCode,
  BuildableSpaceErrorResponse,
  BuildableSpaceErrorStage,
  BuildableSpaceRequest,
  BuildableSpaceResponse,
  EdgeSetbackResponse,
  FloorWidthAlignment,
  PointResponse,
  PolygonResponse,
  RoadType,
} from "./boundary.api.types";

type UnknownRecord = Record<string, unknown>;

type ValidationTarget = "request" | "response";

const ROAD_TYPES: readonly RoadType[] = ["main_road", "private_road"];
const BOUNDARY_SIDES: readonly BoundarySide[] = ["front", "back", "left", "right"];
const FLOOR_WIDTH_ALIGNMENTS: readonly FloorWidthAlignment[] = [
  "parallel_to_entry_road",
  "perpendicular_to_entry_road",
];
const ERROR_STAGES: readonly BuildableSpaceErrorStage[] = [
  "request_validation",
  "reference_data",
  "buildable_land",
  "usable_land",
  "response",
];
const ERROR_CODES: readonly BuildableSpaceErrorCode[] = [
  "invalid_request",
  "invalid_land_boundary",
  "non_convex_land",
  "self_intersecting_land",
  "invalid_road_attachment",
  "multiple_main_entry_roads",
  "unsupported_road_type",
  "reference_data_error",
  "setback_eliminates_buildable_land",
  "buildable_land_calculation_failed",
  "no_usable_land_found",
  "search_limit_exceeded",
  "usable_land_calculation_failed",
  "unexpected_buildable_space_error",
];

const fail = (target: ValidationTarget, path: string, reason: string): never => {
  throw new BoundaryServiceError({
    kind: target === "request" ? "invalid_request" : "invalid_response",
    message: `Invalid buildable-space ${target} at ${path}: ${reason}`,
  });
};

const asRecord = (
  value: unknown,
  path: string,
  target: ValidationTarget,
): UnknownRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(target, path, "expected an object");
  }

  return value as UnknownRecord;
};

const asArray = (
  value: unknown,
  path: string,
  target: ValidationTarget,
): unknown[] => {
  if (!Array.isArray(value)) {
    return fail(target, path, "expected an array");
  }

  return value;
};

const asString = (
  value: unknown,
  path: string,
  target: ValidationTarget,
): string => {
  if (typeof value !== "string" || value.length === 0) {
    return fail(target, path, "expected a non-empty string");
  }

  return value;
};

const asFiniteNumber = (
  value: unknown,
  path: string,
  target: ValidationTarget,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(target, path, "expected a finite number");
  }

  return value;
};

const asNonNegativeNumber = (
  value: unknown,
  path: string,
  target: ValidationTarget,
): number => {
  const numberValue = asFiniteNumber(value, path, target);
  if (numberValue < 0) {
    return fail(target, path, "expected a non-negative number");
  }

  return numberValue;
};

const asInteger = (
  value: unknown,
  path: string,
  target: ValidationTarget,
): number => {
  const numberValue = asFiniteNumber(value, path, target);
  if (!Number.isInteger(numberValue)) {
    return fail(target, path, "expected an integer");
  }

  return numberValue;
};

const asNonNegativeInteger = (
  value: unknown,
  path: string,
  target: ValidationTarget,
): number => {
  const numberValue = asInteger(value, path, target);
  if (numberValue < 0) {
    return fail(target, path, "expected a non-negative integer");
  }

  return numberValue;
};

const asEnumValue = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  target: ValidationTarget,
): T => {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    return fail(target, path, `expected one of: ${allowed.join(", ")}`);
  }

  return value as T;
};

const assertExactKeys = (
  record: UnknownRecord,
  allowedKeys: readonly string[],
  path: string,
): void => {
  const unexpectedKey = Object.keys(record).find((key) => !allowedKeys.includes(key));
  if (unexpectedKey) {
    fail("request", `${path}.${unexpectedKey}`, "unknown field");
  }
};

const parsePointResponse = (value: unknown, path: string): PointResponse => {
  const point = asRecord(value, path, "response");

  return {
    x: asFiniteNumber(point.x, `${path}.x`, "response"),
    y: asFiniteNumber(point.y, `${path}.y`, "response"),
  };
};

const parsePolygonResponse = (
  value: unknown,
  path: string,
  expectedPointCount?: number,
): PolygonResponse => {
  const polygon = asRecord(value, path, "response");
  const points = asArray(polygon.points, `${path}.points`, "response").map((point, index) =>
    parsePointResponse(point, `${path}.points[${index}]`),
  );

  if (expectedPointCount !== undefined && points.length !== expectedPointCount) {
    fail("response", `${path}.points`, `expected exactly ${expectedPointCount} points`);
  }

  if (expectedPointCount === undefined && points.length < 3) {
    fail("response", `${path}.points`, "expected at least 3 points");
  }

  return { points };
};

const parseEdgeSetbackResponse = (
  value: unknown,
  path: string,
): EdgeSetbackResponse => {
  const setback = asRecord(value, path, "response");
  const roadTypeValue = setback.road_type;

  return {
    edge_index: asNonNegativeInteger(setback.edge_index, `${path}.edge_index`, "response"),
    side: asEnumValue(setback.side, BOUNDARY_SIDES, `${path}.side`, "response"),
    base_setback: asNonNegativeNumber(
      setback.base_setback,
      `${path}.base_setback`,
      "response",
    ),
    road_adjustment: asFiniteNumber(
      setback.road_adjustment,
      `${path}.road_adjustment`,
      "response",
    ),
    final_setback: asNonNegativeNumber(
      setback.final_setback,
      `${path}.final_setback`,
      "response",
    ),
    road_type:
      roadTypeValue === null
        ? null
        : asEnumValue(roadTypeValue, ROAD_TYPES, `${path}.road_type`, "response"),
  };
};

export function assertBuildableSpaceRequest(
  value: unknown,
): asserts value is BuildableSpaceRequest {
  const request = asRecord(value, "request", "request");
  assertExactKeys(request, ["land_boundary", "roads"], "request");

  const landBoundary = asRecord(
    request.land_boundary,
    "request.land_boundary",
    "request",
  );
  assertExactKeys(landBoundary, ["points"], "request.land_boundary");

  const points = asArray(
    landBoundary.points,
    "request.land_boundary.points",
    "request",
  );

  if (points.length < 4 || points.length > 50) {
    fail("request", "request.land_boundary.points", "expected 4 to 50 points");
  }

  points.forEach((valueAtIndex, index) => {
    const path = `request.land_boundary.points[${index}]`;
    const point = asRecord(valueAtIndex, path, "request");
    assertExactKeys(point, ["x", "y"], path);

    const x = asInteger(point.x, `${path}.x`, "request");
    const y = asInteger(point.y, `${path}.y`, "request");

    if (Math.abs(x) > 100_000) {
      fail("request", `${path}.x`, "absolute value must not exceed 100000");
    }
    if (Math.abs(y) > 100_000) {
      fail("request", `${path}.y`, "absolute value must not exceed 100000");
    }
  });

  const roads = asArray(request.roads, "request.roads", "request");
  if (roads.length !== 1) {
    fail("request", "request.roads", "expected exactly one road attachment");
  }

  const road = asRecord(roads[0], "request.roads[0]", "request");
  assertExactKeys(
    road,
    ["boundary_edge_index", "role", "road_type"],
    "request.roads[0]",
  );

  const edgeIndex = asNonNegativeInteger(
    road.boundary_edge_index,
    "request.roads[0].boundary_edge_index",
    "request",
  );
  if (edgeIndex >= points.length) {
    fail(
      "request",
      "request.roads[0].boundary_edge_index",
      "must identify an existing boundary edge",
    );
  }

  if (road.role !== "main_entry") {
    fail("request", "request.roads[0].role", "expected main_entry");
  }

  asEnumValue(road.road_type, ROAD_TYPES, "request.roads[0].road_type", "request");
}

export const parseBuildableSpaceResponse = (
  value: unknown,
): BuildableSpaceResponse => {
  const response = asRecord(value, "response", "response");
  const units = asRecord(response.units, "response.units", "response");
  const originalLand = asRecord(
    response.original_land,
    "response.original_land",
    "response",
  );
  const buildableLand = asRecord(
    response.buildable_land,
    "response.buildable_land",
    "response",
  );
  const usableLand = asRecord(
    response.usable_land,
    "response.usable_land",
    "response",
  );

  const projectUnitsPerMeter = asFiniteNumber(
    units.project_units_per_meter,
    "response.units.project_units_per_meter",
    "response",
  );
  if (projectUnitsPerMeter <= 0) {
    fail(
      "response",
      "response.units.project_units_per_meter",
      "expected a positive number",
    );
  }

  return {
    flow_id: asString(response.flow_id, "response.flow_id", "response"),
    units: {
      project_units_per_meter: projectUnitsPerMeter,
    },
    original_land: {
      area: asNonNegativeNumber(
        originalLand.area,
        "response.original_land.area",
        "response",
      ),
    },
    buildable_land: {
      boundary: parsePolygonResponse(
        buildableLand.boundary,
        "response.buildable_land.boundary",
      ),
      area: asNonNegativeNumber(
        buildableLand.area,
        "response.buildable_land.area",
        "response",
      ),
      edge_setbacks: asArray(
        buildableLand.edge_setbacks,
        "response.buildable_land.edge_setbacks",
        "response",
      ).map((setback, index) =>
        parseEdgeSetbackResponse(
          setback,
          `response.buildable_land.edge_setbacks[${index}]`,
        ),
      ),
    },
    usable_land: {
      boundary: parsePolygonResponse(
        usableLand.boundary,
        "response.usable_land.boundary",
        4,
      ),
      width: asNonNegativeInteger(
        usableLand.width,
        "response.usable_land.width",
        "response",
      ),
      length: asNonNegativeInteger(
        usableLand.length,
        "response.usable_land.length",
        "response",
      ),
      area: asNonNegativeInteger(
        usableLand.area,
        "response.usable_land.area",
        "response",
      ),
      floor_width_alignment: asEnumValue(
        usableLand.floor_width_alignment,
        FLOOR_WIDTH_ALIGNMENTS,
        "response.usable_land.floor_width_alignment",
        "response",
      ),
      entry_road_edge_index: asNonNegativeInteger(
        usableLand.entry_road_edge_index,
        "response.usable_land.entry_road_edge_index",
        "response",
      ),
    },
    reference_profile: asString(
      response.reference_profile,
      "response.reference_profile",
      "response",
    ),
  };
};

export const parseBuildableSpaceErrorResponse = (
  value: unknown,
): BuildableSpaceErrorResponse => {
  const response = asRecord(value, "error_response", "response");
  const details = asRecord(response.details, "error_response.details", "response");

  return {
    flow_id: asString(response.flow_id, "error_response.flow_id", "response"),
    stage: asEnumValue(
      response.stage,
      ERROR_STAGES,
      "error_response.stage",
      "response",
    ),
    code: asEnumValue(response.code, ERROR_CODES, "error_response.code", "response"),
    message: asString(response.message, "error_response.message", "response"),
    details,
  };
};
