import {
  GENERATION_EVENT_NAMES, JOB_STATES, OPENING_PURPOSES, OPENING_TYPES, ROOM_ROLES,
  type CandidateHint, type FloorPlan, type FloorPlanGenerationRequest, type FloorPlanJobStatus,
  type FloorPlanResult, type GenerationJobDescriptor, type GenerationSseEvent,
} from "../../types";
import type { ApiGenerationRequest } from "./floor-plan.api.types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const object = (value: unknown, path: string): Record<string, unknown> => {
  if (!isRecord(value)) throw new Error(`Invalid ${path}`); return value;
};
const text = (value: unknown, path: string): string => {
  if (typeof value !== "string") throw new Error(`Invalid ${path}`); return value;
};
const number = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Invalid ${path}`); return value;
};
const nullableText = (value: unknown, path: string): string | null =>
  value === null || value === undefined ? null : text(value, path);
const points = (value: unknown, path: string) => {
  const boundary = object(value, path); if (!Array.isArray(boundary.points)) throw new Error(`Invalid ${path}.points`);
  return { points: boundary.points.map((item, index) => {
    const point = object(item, `${path}.points[${index}]`);
    return { x: number(point.x, "point.x"), y: number(point.y, "point.y") };
  }) };
};

export const toFloorPlanApiRequest = (request: FloorPlanGenerationRequest): ApiGenerationRequest => ({
  floor_limits: { max_width: Math.round(request.floorLimits.maxWidth), max_length: Math.round(request.floorLimits.maxLength) },
  aspect_ratio: request.aspectRatio,
  rooms: request.rooms.map((room) => ({
    room_type: room.roomType, ...(room.id !== undefined ? { id: room.id } : {}),
    ...(room.name !== undefined ? { name: room.name } : {}),
    ...(room.requestedSize !== undefined ? { requested_size: room.requestedSize } : {}),
  })),
});

export const parseFloorPlan = (value: unknown): FloorPlan => {
  const plan = object(value, "floor_plan");
  if (!Array.isArray(plan.rooms) || !Array.isArray(plan.openings)) throw new Error("Invalid floor plan collections");
  const roles = new Set<string>(ROOM_ROLES); const openingTypes = new Set<string>(OPENING_TYPES);
  const purposes = new Set<string>(OPENING_PURPOSES);
  return {
    boundary: points(plan.boundary, "floor_plan.boundary"),
    rooms: plan.rooms.map((value) => {
      const room = object(value, "floor_plan.rooms[]"); const role = text(room.role, "room.role");
      if (!roles.has(role)) throw new Error("Invalid room.role");
      const metadata = object(room.metadata, "room.metadata");
      return { id: text(room.id, "room.id"), roomType: text(room.room_type, "room.room_type"),
        name: text(room.name, "room.name"), boundary: points(room.boundary, "room.boundary"),
        role: role as FloorPlan["rooms"][number]["role"], parentRoomId: nullableText(room.parent_room_id, "room.parent_room_id"),
        metadata: { sourceRoomIds: Array.isArray(metadata.source_room_ids) ? metadata.source_room_ids.map((id) => text(id, "source id")) : [],
          appliedTransformations: Array.isArray(metadata.applied_transformations) ? metadata.applied_transformations.map((id) => text(id, "transformation")) : [] } };
    }),
    openings: plan.openings.map((value) => {
      const opening = object(value, "floor_plan.openings[]"); const openingType = text(opening.opening_type, "opening.type");
      const purpose = text(opening.purpose, "opening.purpose");
      if (!openingTypes.has(openingType) || !purposes.has(purpose)) throw new Error("Invalid opening");
      const start = object(opening.start, "opening.start"); const end = object(opening.end, "opening.end");
      return { id: text(opening.id, "opening.id"), openingType: openingType as FloorPlan["openings"][number]["openingType"],
        purpose: purpose as FloorPlan["openings"][number]["purpose"],
        start: { x: number(start.x, "start.x"), y: number(start.y, "start.y") },
        end: { x: number(end.x, "end.x"), y: number(end.y, "end.y") },
        connectedRoomIds: Array.isArray(opening.connected_room_ids) ? opening.connected_room_ids.map((id) => text(id, "room id")) : [] };
    }),
    identityRedirects: isRecord(plan.identity_redirects) ? Object.fromEntries(Object.entries(plan.identity_redirects).map(([key, value]) => [key, text(value, "redirect")])) : {},
    appliedTransformations: Array.isArray(plan.applied_transformations) ? plan.applied_transformations.map((item) => text(item, "transformation")) : [],
  };
};

const parseError = (value: unknown) => {
  if (value === null || value === undefined) return null; const error = object(value, "error");
  return { code: text(error.code, "error.code"), message: text(error.message, "error.message"),
    recoverable: typeof error.recoverable === "boolean" ? error.recoverable : undefined,
    details: isRecord(error.details) ? error.details : {} };
};
const parseResult = (value: unknown): FloorPlanResult | null => {
  if (value === null || value === undefined) return null; const result = object(value, "result");
  const scoring = object(result.scoring, "result.scoring"); const classification = text(result.classification, "classification");
  const outcome = text(result.outcome, "outcome");
  if (classification !== "presentable" && classification !== "usable") throw new Error("Invalid classification");
  if (outcome !== "presentable_plan_found" && outcome !== "best_usable_plan_returned") throw new Error("Invalid outcome");
  const critical = scoring.critical_failure;
  return { floorPlan: parseFloorPlan(result.floor_plan), classification, outcome,
    scoring: { totalScore: number(scoring.total_score, "score"), passedCritical: scoring.passed_critical === true,
      criticalFailure: isRecord(critical) ? { code: text(critical.code, "finding.code"), message: text(critical.message, "finding.message"),
        severity: (critical.severity === "warning" || critical.severity === "info") ? critical.severity : "error",
        subjectIds: Array.isArray(critical.subject_ids) ? critical.subject_ids.map((id) => text(id, "subject")) : [],
        metrics: isRecord(critical.metrics) ? Object.fromEntries(Object.entries(critical.metrics).filter((entry): entry is [string, number] => typeof entry[1] === "number")) : [] } : null } };
};

export const parseJobDescriptor = (value: unknown): GenerationJobDescriptor => {
  const job = object(value, "job"); const state = text(job.state, "job.state");
  if (!new Set<string>(JOB_STATES).has(state)) throw new Error("Invalid job state");
  return { jobId: text(job.job_id, "job.job_id"), state: state as GenerationJobDescriptor["state"],
    statusUrl: text(job.status_url, "job.status_url"), eventsUrl: text(job.events_url, "job.events_url"),
    cancellationUrl: text(job.cancellation_url, "job.cancellation_url") };
};

export const parseJobStatus = (value: unknown): FloorPlanJobStatus => {
  const job = object(value, "job status"); const state = text(job.state, "job.state");
  if (!new Set<string>(JOB_STATES).has(state)) throw new Error("Invalid job state");
  let result: FloorPlanResult | null = null; let bestAvailable: FloorPlanResult | null = null;
  if (state === "timed_out" && isRecord(job.result) && "best_available" in job.result) {
    bestAvailable = parseResult(job.result.best_available);
  } else if (state === "timed_out") bestAvailable = parseResult(job.result);
  else result = parseResult(job.result);
  return { jobId: text(job.job_id, "job.job_id"), state: state as FloorPlanJobStatus["state"],
    createdAt: text(job.created_at, "job.created_at"), startedAt: nullableText(job.started_at, "job.started_at"),
    completedAt: nullableText(job.completed_at, "job.completed_at"), result, bestAvailable, error: parseError(job.error) };
};

export const parseGenerationEvent = (value: unknown, expectedType: string): GenerationSseEvent => {
  const event = object(value, "SSE event"); const eventType = text(event.event_type, "event_type");
  if (!new Set<string>(GENERATION_EVENT_NAMES).has(eventType) || eventType !== expectedType) throw new Error("SSE event type mismatch");
  const schema = text(event.schema_version, "schema_version"); if (schema !== "1.0") throw new Error("Unsupported SSE schema");
  const data = isRecord(event.data) ? event.data : {};
  return { schemaVersion: schema, jobId: text(event.job_id, "job_id"), sequence: number(event.sequence, "sequence"),
    eventType: eventType as GenerationSseEvent["eventType"], stage: text(event.stage, "stage"), state: text(event.state, "state"),
    message: text(event.message, "message"), data, error: parseError(event.error),
    trialNumber: event.trial_number === null ? null : number(event.trial_number, "trial_number"),
    candidateId: typeof event.candidate_id === "number" || typeof event.candidate_id === "string" ? event.candidate_id : null,
    timestampUtc: text(event.timestamp_utc, "timestamp_utc") };
};
export const candidateHintsFromEvent = (event: GenerationSseEvent): CandidateHint[] =>
  Array.isArray(event.data.candidate_hints) ? event.data.candidate_hints.map((value) => {
    const hint = object(value, "candidate hint"); return { roomId: text(hint.room_id, "hint.room_id"),
      x: number(hint.x, "hint.x"), y: number(hint.y, "hint.y"),
      roomType: typeof hint.room_type === "string" ? hint.room_type : null,
      hintIndex: number(hint.hint_index, "hint.hint_index") };
  }) : [];
export const floorPlanFromEvent = (event: GenerationSseEvent): FloorPlan | null =>
  event.data.floor_plan === undefined ? null : parseFloorPlan(event.data.floor_plan);
