import { createPrimitiveValidators } from "../validation";
import type { ValidationFailure } from "../validation";
import { extractApiFailure, readResponseBody } from "../http";
import { FloorPlanServiceError } from "./floor-plan.errors";
import {
  COMPLETION_OUTCOMES,
  GENERATION_CANCELLATION_STATUSES,
  FLOOR_PLAN_CLASSIFICATIONS,
  GENERATION_EVENT_NAMES,
  GENERATION_STATUSES,
  OPENING_PURPOSES,
  OPENING_TYPES,
  ROOM_ROLES,
  ROOM_TYPES,
  type CancelledPayload,
  type CandidateHint,
  type CandidateTrialPayload,
  type CompletedPayload,
  type FloorPlan,
  type FloorPlanOpening,
  type FloorPlanPayload,
  type FloorPlanRoom,
  type GenerationCancellationResponse,
  type GenerationEventName,
  type GenerationHttpErrorBody,
  type GenerationRequest,
  type GenerationSseEvent,
  type Point,
  type Polygon,
  type ProgressPayload,
  type RoomMetadata,
  type StatusPayload,
  type StreamErrorPayload,
} from "./floor-plan.api.types";

const failFloorPlanValidation: ValidationFailure = (
  target,
  path,
  reason,
): never => {
  throw new FloorPlanServiceError({
    kind: target === "request" ? "invalid_request" : "invalid_response",
    message: `Invalid floor-plan ${target} at ${path}: ${reason}`,
  });
};

const {
  asRecord,
  asArray,
  asBoolean,
  asString,
  asFiniteNumber,
  asNonNegativeNumber,
  asPositiveNumber,
  asPositiveInteger,
  asEnumValue,
  assertExactKeys,
  assertArrayLength,
} = createPrimitiveValidators(failFloorPlanValidation);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseNullableString = (
  value: unknown,
  path: string,
  target: "request" | "response",
): string | null => {
  return value === null ? null : asString(value, path, target);
};

const parseOptionalNullableString = (
  value: unknown,
  path: string,
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return failFloorPlanValidation("request", path, "expected a string or null");
  }

  return value;
};

const parseStringArray = (value: unknown, path: string): string[] => {
  return asArray(value, path, "response").map((item, index) =>
    asString(item, `${path}[${index}]`, "response"),
  );
};

const parsePoint = (value: unknown, path: string): Point => {
  const point = asRecord(value, path, "response");
  assertExactKeys(point, ["x", "y"], path, "response");

  return {
    x: asFiniteNumber(point.x, `${path}.x`, "response"),
    y: asFiniteNumber(point.y, `${path}.y`, "response"),
  };
};

const parsePolygon = (value: unknown, path: string): Polygon => {
  const polygon = asRecord(value, path, "response");
  assertExactKeys(polygon, ["points"], path, "response");

  return {
    points: asArray(polygon.points, `${path}.points`, "response").map(
      (point, index) => parsePoint(point, `${path}.points[${index}]`),
    ),
  };
};

const parseRoomMetadata = (value: unknown, path: string): RoomMetadata => {
  const metadata = asRecord(value, path, "response");
  assertExactKeys(
    metadata,
    ["source_room_ids", "applied_transformations"],
    path,
    "response",
  );

  return {
    source_room_ids: parseStringArray(
      metadata.source_room_ids,
      `${path}.source_room_ids`,
    ),
    applied_transformations: parseStringArray(
      metadata.applied_transformations,
      `${path}.applied_transformations`,
    ),
  };
};

const parseFloorPlanRoom = (value: unknown, path: string): FloorPlanRoom => {
  const room = asRecord(value, path, "response");
  assertExactKeys(
    room,
    [
      "id",
      "room_type",
      "name",
      "boundary",
      "role",
      "parent_room_id",
      "metadata",
    ],
    path,
    "response",
  );

  return {
    id: asString(room.id, `${path}.id`, "response"),
    room_type: asString(room.room_type, `${path}.room_type`, "response"),
    name: asString(room.name, `${path}.name`, "response"),
    boundary: parsePolygon(room.boundary, `${path}.boundary`),
    role: asEnumValue(room.role, ROOM_ROLES, `${path}.role`, "response"),
    parent_room_id: parseNullableString(
      room.parent_room_id,
      `${path}.parent_room_id`,
      "response",
    ),
    metadata: parseRoomMetadata(room.metadata, `${path}.metadata`),
  };
};

const parseFloorPlanOpening = (
  value: unknown,
  path: string,
): FloorPlanOpening => {
  const opening = asRecord(value, path, "response");
  assertExactKeys(
    opening,
    [
      "id",
      "opening_type",
      "purpose",
      "start",
      "end",
      "connected_room_ids",
    ],
    path,
    "response",
  );

  return {
    id: asString(opening.id, `${path}.id`, "response"),
    opening_type: asEnumValue(
      opening.opening_type,
      OPENING_TYPES,
      `${path}.opening_type`,
      "response",
    ),
    purpose: asEnumValue(
      opening.purpose,
      OPENING_PURPOSES,
      `${path}.purpose`,
      "response",
    ),
    start: parsePoint(opening.start, `${path}.start`),
    end: parsePoint(opening.end, `${path}.end`),
    connected_room_ids: parseStringArray(
      opening.connected_room_ids,
      `${path}.connected_room_ids`,
    ),
  };
};

const parseStringRecord = (
  value: unknown,
  path: string,
): Record<string, string> => {
  const record = asRecord(value, path, "response");

  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      asString(item, `${path}.${key}`, "response"),
    ]),
  );
};

const parseFloorPlan = (value: unknown, path: string): FloorPlan => {
  const floorPlan = asRecord(value, path, "response");
  assertExactKeys(
    floorPlan,
    [
      "boundary",
      "rooms",
      "openings",
      "identity_redirects",
      "applied_transformations",
    ],
    path,
    "response",
  );

  return {
    boundary: parsePolygon(floorPlan.boundary, `${path}.boundary`),
    rooms: asArray(floorPlan.rooms, `${path}.rooms`, "response").map(
      (room, index) => parseFloorPlanRoom(room, `${path}.rooms[${index}]`),
    ),
    openings: asArray(
      floorPlan.openings,
      `${path}.openings`,
      "response",
    ).map((opening, index) =>
      parseFloorPlanOpening(opening, `${path}.openings[${index}]`),
    ),
    identity_redirects: parseStringRecord(
      floorPlan.identity_redirects,
      `${path}.identity_redirects`,
    ),
    applied_transformations: parseStringArray(
      floorPlan.applied_transformations,
      `${path}.applied_transformations`,
    ),
  };
};

const validateAspectRatioString = (value: string, path: string): void => {
  const trimmed = value.trim();
  const parts = trimmed.split(":");

  if (parts.length !== 2) {
    failFloorPlanValidation("request", path, "expected H:W format");
  }

  const height = Number(parts[0]);
  const width = Number(parts[1]);

  if (!Number.isFinite(height) || !Number.isFinite(width)) {
    failFloorPlanValidation("request", path, "H and W must be numeric");
  }

  if (width === 0) {
    failFloorPlanValidation("request", path, "W cannot be zero");
  }

  const ratio = height / width;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    failFloorPlanValidation("request", path, "expected a finite positive ratio");
  }

  if (ratio < 0.5 || ratio > 2) {
    failFloorPlanValidation(
      "request",
      path,
      "evaluated ratio must be between 0.5 and 2.0 inclusive",
    );
  }
};

export function assertFloorPlanGenerationRequest(
  value: unknown,
): asserts value is GenerationRequest {
  const request = asRecord(value, "request", "request");

  // The server currently ignores unknown top-level and room properties, but
  // the client intentionally sends only the documented contract.
  assertExactKeys(
    request,
    ["floor_limits", "aspect_ratio", "rooms"],
    "request",
    "request",
  );

  const floorLimits = asRecord(
    request.floor_limits,
    "request.floor_limits",
    "request",
  );
  assertExactKeys(
    floorLimits,
    ["max_width", "max_length"],
    "request.floor_limits",
    "request",
  );
  asPositiveNumber(
    floorLimits.max_width,
    "request.floor_limits.max_width",
    "request",
  );
  asPositiveNumber(
    floorLimits.max_length,
    "request.floor_limits.max_length",
    "request",
  );

  if (typeof request.aspect_ratio === "number") {
    const ratio = asPositiveNumber(
      request.aspect_ratio,
      "request.aspect_ratio",
      "request",
    );
    if (ratio < 0.5 || ratio > 2) {
      failFloorPlanValidation(
        "request",
        "request.aspect_ratio",
        "expected a value between 0.5 and 2.0 inclusive",
      );
    }
  } else if (typeof request.aspect_ratio === "string") {
    validateAspectRatioString(request.aspect_ratio, "request.aspect_ratio");
  } else {
    failFloorPlanValidation(
      "request",
      "request.aspect_ratio",
      "expected a number or H:W string",
    );
  }

  const rooms = asArray(request.rooms, "request.rooms", "request");
  assertArrayLength(rooms, "request.rooms", "request", { min: 1 });

  const explicitIds = new Set<string>();

  rooms.forEach((roomValue, index) => {
    const path = `request.rooms[${index}]`;
    const room = asRecord(roomValue, path, "request");
    assertExactKeys(
      room,
      ["room_type", "id", "name", "requested_size"],
      path,
      "request",
    );

    asEnumValue(room.room_type, ROOM_TYPES, `${path}.room_type`, "request");

    if (room.id !== undefined) {
      const id = parseOptionalNullableString(room.id, `${path}.id`);
      const normalizedId = typeof id === "string" ? id.trim() : "";
      if (normalizedId.length > 0) {
        if (explicitIds.has(normalizedId)) {
          failFloorPlanValidation(
            "request",
            `${path}.id`,
            `duplicate room ID: ${normalizedId}`,
          );
        }
        explicitIds.add(normalizedId);
      }
    }

    if (room.name !== undefined) {
      parseOptionalNullableString(room.name, `${path}.name`);
    }

    if (room.requested_size !== undefined) {
      const requestedSize = parseOptionalNullableString(
        room.requested_size,
        `${path}.requested_size`,
      );
      if (
        typeof requestedSize === "string" &&
        requestedSize.trim().length === 0
      ) {
        failFloorPlanValidation(
          "request",
          `${path}.requested_size`,
          "expected a non-empty string or null",
        );
      }
    }

  });
}

const parseStatusPayload = (value: unknown, path: string): StatusPayload => {
  const payload = asRecord(value, path, "response");
  assertExactKeys(payload, ["status"], path, "response");

  return {
    status: asEnumValue(
      payload.status,
      GENERATION_STATUSES,
      `${path}.status`,
      "response",
    ),
  };
};

const parseCandidateHint = (value: unknown, path: string): CandidateHint => {
  const hint = asRecord(value, path, "response");
  assertExactKeys(
    hint,
    ["room_id", "x", "y", "room_type", "hint_index"],
    path,
    "response",
  );

  return {
    room_id: asString(hint.room_id, `${path}.room_id`, "response"),
    x: asFiniteNumber(hint.x, `${path}.x`, "response"),
    y: asFiniteNumber(hint.y, `${path}.y`, "response"),
    room_type:
      hint.room_type === null
        ? null
        : asString(hint.room_type, `${path}.room_type`, "response"),
    hint_index: asPositiveInteger(
      hint.hint_index,
      `${path}.hint_index`,
      "response",
    ),
  };
};

const parseCandidateTrialPayload = (
  value: unknown,
  path: string,
): CandidateTrialPayload => {
  const payload = asRecord(value, path, "response");
  assertExactKeys(
    payload,
    ["trial_number", "trial_limit", "candidate_hints"],
    path,
    "response",
  );

  return {
    trial_number: asPositiveInteger(
      payload.trial_number,
      `${path}.trial_number`,
      "response",
    ),
    trial_limit: asPositiveInteger(
      payload.trial_limit,
      `${path}.trial_limit`,
      "response",
    ),
    candidate_hints: asArray(
      payload.candidate_hints,
      `${path}.candidate_hints`,
      "response",
    ).map((hint, index) =>
      parseCandidateHint(hint, `${path}.candidate_hints[${index}]`),
    ),
  };
};

const parseProgressPayload = (
  value: unknown,
  path: string,
): ProgressPayload => {
  const payload = asRecord(value, path, "response");
  assertExactKeys(
    payload,
    ["stage", "trial_number", "trial_limit", "elapsed_ms", "timeout_ms"],
    path,
    "response",
  );

  return {
    stage: asString(payload.stage, `${path}.stage`, "response"),
    trial_number: asPositiveInteger(
      payload.trial_number,
      `${path}.trial_number`,
      "response",
    ),
    trial_limit: asPositiveInteger(
      payload.trial_limit,
      `${path}.trial_limit`,
      "response",
    ),
    elapsed_ms: asNonNegativeNumber(
      payload.elapsed_ms,
      `${path}.elapsed_ms`,
      "response",
    ),
    timeout_ms: asPositiveNumber(
      payload.timeout_ms,
      `${path}.timeout_ms`,
      "response",
    ),
  };
};

const parseFloorPlanPayload = (
  value: unknown,
  path: string,
): FloorPlanPayload => {
  const payload = asRecord(value, path, "response");
  assertExactKeys(
    payload,
    [
      "classification",
      "trial_number",
      "candidate_id",
      "solver_run_id",
      "score",
      "passed_critical",
      "floor_plan",
    ],
    path,
    "response",
  );

  return {
    classification: asEnumValue(
      payload.classification,
      FLOOR_PLAN_CLASSIFICATIONS,
      `${path}.classification`,
      "response",
    ),
    trial_number:
      payload.trial_number === null
        ? null
        : asPositiveInteger(
            payload.trial_number,
            `${path}.trial_number`,
            "response",
          ),
    candidate_id: asPositiveInteger(
      payload.candidate_id,
      `${path}.candidate_id`,
      "response",
    ),
    solver_run_id: asPositiveInteger(
      payload.solver_run_id,
      `${path}.solver_run_id`,
      "response",
    ),
    score: asFiniteNumber(payload.score, `${path}.score`, "response"),
    passed_critical: asBoolean(
      payload.passed_critical,
      `${path}.passed_critical`,
      "response",
    ),
    floor_plan: parseFloorPlan(payload.floor_plan, `${path}.floor_plan`),
  };
};

const parseCompletedPayload = (
  value: unknown,
  path: string,
): CompletedPayload => {
  const payload = asRecord(value, path, "response");
  assertExactKeys(
    payload,
    ["outcome", "final_floor_plan_sequence", "elapsed_ms"],
    path,
    "response",
  );

  return {
    outcome: asEnumValue(
      payload.outcome,
      COMPLETION_OUTCOMES,
      `${path}.outcome`,
      "response",
    ),
    final_floor_plan_sequence:
      payload.final_floor_plan_sequence === null
        ? null
        : asPositiveInteger(
            payload.final_floor_plan_sequence,
            `${path}.final_floor_plan_sequence`,
            "response",
          ),
    elapsed_ms: asNonNegativeNumber(
      payload.elapsed_ms,
      `${path}.elapsed_ms`,
      "response",
    ),
  };
};

const parseCancelledPayload = (
  value: unknown,
  path: string,
): CancelledPayload => {
  const payload = asRecord(value, path, "response");
  assertExactKeys(payload, ["reason"], path, "response");

  return {
    reason: asString(payload.reason, `${path}.reason`, "response"),
  };
};

const parseStreamErrorPayload = (
  value: unknown,
  path: string,
): StreamErrorPayload => {
  const payload = asRecord(value, path, "response");
  assertExactKeys(
    payload,
    ["stage", "code", "message", "details", "recoverable"],
    path,
    "response",
  );

  return {
    stage: asString(payload.stage, `${path}.stage`, "response"),
    code: asString(payload.code, `${path}.code`, "response"),
    message: asString(payload.message, `${path}.message`, "response"),
    details: asRecord(payload.details, `${path}.details`, "response"),
    recoverable: asBoolean(
      payload.recoverable,
      `${path}.recoverable`,
      "response",
    ),
  };
};

const parseTimestamp = (value: unknown, path: string): string => {
  const timestamp = asString(value, path, "response");

  if (!timestamp.endsWith("Z") || Number.isNaN(Date.parse(timestamp))) {
    failFloorPlanValidation(
      "response",
      path,
      "expected a UTC ISO 8601 timestamp",
    );
  }

  return timestamp;
};

const parseJobId = (value: unknown, path: string): string => {
  const jobId = asString(value, path, "response");

  if (!UUID_PATTERN.test(jobId)) {
    failFloorPlanValidation("response", path, "expected a UUID string");
  }

  return jobId;
};

const parseEnvelope = (value: unknown): GenerationSseEvent => {
  const envelope = asRecord(value, "SSE envelope", "response");
  assertExactKeys(
    envelope,
    [
      "schema_version",
      "sequence",
      "timestamp",
      "job_id",
      "event",
      "payload",
    ],
    "SSE envelope",
    "response",
  );

  const schemaVersion = asPositiveInteger(
    envelope.schema_version,
    "SSE envelope.schema_version",
    "response",
  );
  if (schemaVersion !== 1) {
    failFloorPlanValidation(
      "response",
      "SSE envelope.schema_version",
      `unsupported schema version ${schemaVersion}`,
    );
  }

  const sequence = asPositiveInteger(
    envelope.sequence,
    "SSE envelope.sequence",
    "response",
  );
  const timestamp = parseTimestamp(
    envelope.timestamp,
    "SSE envelope.timestamp",
  );
  const jobId = parseJobId(envelope.job_id, "SSE envelope.job_id");
  const event = asEnumValue(
    envelope.event,
    GENERATION_EVENT_NAMES,
    "SSE envelope.event",
    "response",
  );

  const base = {
    schema_version: 1 as const,
    sequence,
    timestamp,
    job_id: jobId,
  };

  switch (event) {
    case "status":
      return {
        ...base,
        event,
        payload: parseStatusPayload(envelope.payload, "SSE status.payload"),
      };
    case "candidate_trial":
      return {
        ...base,
        event,
        payload: parseCandidateTrialPayload(
          envelope.payload,
          "SSE candidate_trial.payload",
        ),
      };
    case "progress":
      return {
        ...base,
        event,
        payload: parseProgressPayload(
          envelope.payload,
          "SSE progress.payload",
        ),
      };
    case "floor_plan":
      return {
        ...base,
        event,
        payload: parseFloorPlanPayload(
          envelope.payload,
          "SSE floor_plan.payload",
        ),
      };
    case "completed":
      return {
        ...base,
        event,
        payload: parseCompletedPayload(
          envelope.payload,
          "SSE completed.payload",
        ),
      };
    case "cancelled":
      return {
        ...base,
        event,
        payload: parseCancelledPayload(
          envelope.payload,
          "SSE cancelled.payload",
        ),
      };
    case "error":
      return {
        ...base,
        event,
        payload: parseStreamErrorPayload(
          envelope.payload,
          "SSE error.payload",
        ),
      };
  }
};

export const parseGenerationStreamEvent = (
  rawData: string,
  wireEvent: string | null,
  wireId: string | null,
  expectedJobId: string | null,
): GenerationSseEvent => {
  let decoded: unknown;

  try {
    decoded = JSON.parse(rawData) as unknown;
  } catch (error: unknown) {
    throw new FloorPlanServiceError({
      kind: "sse_protocol",
      message: "The floor-plan SSE data field is not valid JSON.",
      eventName: wireEvent ?? undefined,
      rawData,
      cause: error,
    });
  }

  const event = parseEnvelope(decoded);

  if (wireEvent === null || wireEvent.length === 0) {
    throw new FloorPlanServiceError({
      kind: "sse_protocol",
      message: "The floor-plan SSE frame is missing its event field.",
      jobId: event.job_id,
      rawData,
    });
  }

  if (wireEvent !== event.event) {
    throw new FloorPlanServiceError({
      kind: "sse_protocol",
      message: `SSE event field ${wireEvent} does not match envelope event ${event.event}.`,
      jobId: event.job_id,
      eventName: wireEvent,
      rawData,
    });
  }

  if (wireId === null || wireId.length === 0) {
    // The cancellation API documentation shows the terminal cancelled frame
    // without an SSE id line. Its envelope sequence remains authoritative.
    if (event.event !== "cancelled") {
      throw new FloorPlanServiceError({
        kind: "sse_protocol",
        message: "The floor-plan SSE frame is missing a decimal id field.",
        jobId: event.job_id,
        eventName: event.event,
        rawData,
      });
    }
  } else {
    if (!/^\d+$/.test(wireId)) {
      throw new FloorPlanServiceError({
        kind: "sse_protocol",
        message: "The floor-plan SSE id field is not decimal.",
        jobId: event.job_id,
        eventName: event.event,
        rawData,
      });
    }

    if (Number(wireId) !== event.sequence) {
      throw new FloorPlanServiceError({
        kind: "sse_protocol",
        message: `SSE id ${wireId} does not match envelope sequence ${event.sequence}.`,
        jobId: event.job_id,
        eventName: event.event,
        rawData,
      });
    }
  }

  if (expectedJobId !== null && event.job_id !== expectedJobId) {
    throw new FloorPlanServiceError({
      kind: "sse_protocol",
      message: "The SSE event job_id changed within the same stream.",
      jobId: event.job_id,
      eventName: event.event,
      rawData,
      details: {
        expectedJobId,
        receivedJobId: event.job_id,
      },
    });
  }

  return event;
};

export const parseGenerationCancellationResponse = (
  value: unknown,
  expectedJobId?: string,
): GenerationCancellationResponse => {
  const response = asRecord(value, "cancellation response", "response");
  assertExactKeys(
    response,
    ["job_id", "status"],
    "cancellation response",
    "response",
  );

  const jobId = parseJobId(response.job_id, "cancellation response.job_id");
  if (expectedJobId !== undefined && jobId !== expectedJobId) {
    failFloorPlanValidation(
      "response",
      "cancellation response.job_id",
      "does not match the requested job ID",
    );
  }

  return {
    job_id: jobId,
    status: asEnumValue(
      response.status,
      GENERATION_CANCELLATION_STATUSES,
      "cancellation response.status",
      "response",
    ),
  };
};

export const readGenerationHttpErrorBody = async (
  response: Response,
): Promise<GenerationHttpErrorBody> =>
  (await readResponseBody(response)) as GenerationHttpErrorBody;

export interface ExtractedGenerationHttpError {
  message: string | null;
  code?: string;
  stage?: string;
  details?: Record<string, unknown>;
}

export const extractGenerationHttpError = (
  body: GenerationHttpErrorBody,
): ExtractedGenerationHttpError => {
  const commonFailure = extractApiFailure(body);
  if (
    commonFailure.message !== null ||
    commonFailure.code !== undefined ||
    commonFailure.stage !== undefined
  ) {
    return {
      message: commonFailure.message,
      code: commonFailure.code,
      stage: commonFailure.stage,
      details: commonFailure.details,
    };
  }

  if (typeof body === "string") {
    return {
      message: body.trim().length > 0 ? body : null,
    };
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { message: null };
  }

  const record = body as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : null;
  const code = typeof record.code === "string" ? record.code : undefined;
  const stage = typeof record.stage === "string" ? record.stage : undefined;

  if (message !== null) {
    return { message, code, stage };
  }

  if (Array.isArray(record.detail)) {
    const issues = record.detail
      .map((issue) => {
        if (typeof issue !== "object" || issue === null || Array.isArray(issue)) {
          return null;
        }

        const issueRecord = issue as Record<string, unknown>;
        const issueMessage =
          typeof issueRecord.msg === "string" ? issueRecord.msg : null;
        const location = Array.isArray(issueRecord.loc)
          ? issueRecord.loc.map(String).join(".")
          : null;

        if (issueMessage === null) {
          return null;
        }

        return location ? `${location}: ${issueMessage}` : issueMessage;
      })
      .filter((issue): issue is string => issue !== null);

    if (issues.length > 0) {
      return {
        message: issues.join("; "),
        code,
        stage,
      };
    }
  }

  if (typeof record.detail === "string") {
    return {
      message: record.detail,
      code,
      stage,
    };
  }

  return { message: null, code, stage };
};

export const isGenerationEventName = (
  value: string,
): value is GenerationEventName => {
  return GENERATION_EVENT_NAMES.includes(value as GenerationEventName);
};
