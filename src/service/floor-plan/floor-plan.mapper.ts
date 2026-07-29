import type {
  CancelledEvent,
  CancelledPayload,
  CandidateHint,
  CandidateTrialEvent,
  CandidateTrialPayload,
  CompletedEvent,
  CompletedPayload,
  EnclosedVoidsVisualizationData,
  EvaluatorExecutionResult,
  EvaluatorVisualizationPayload,
  FloorPlan,
  FloorPlanEvent,
  FloorPlanGenerationRequest,
  FloorPlanOpening,
  FloorPlanPayload,
  FloorPlanRoom,
  FloorPlanScoring,
  GenerationCancellationResult,
  GenerationErrorEvent,
  GenerationResponse,
  GenerationRoom,
  GenerationSseEvent,
  InwardRecessVisualizationData,
  Point,
  Polygon,
  ProgressEvent,
  ProgressPayload,
  RoomMetadata,
  ScoreFinding,
  ScoreMetric,
  ScoringGroupResult,
  StatusEvent,
  StatusPayload,
  StreamErrorPayload,
} from "../../types";
import type {
  CancelledEvent as ApiCancelledEvent,
  CancelledPayload as ApiCancelledPayload,
  CandidateHint as ApiCandidateHint,
  CandidateTrialEvent as ApiCandidateTrialEvent,
  CandidateTrialPayload as ApiCandidateTrialPayload,
  CompletedEvent as ApiCompletedEvent,
  CompletedPayload as ApiCompletedPayload,
  EnclosedVoidsVisualizationData as ApiEnclosedVoidsVisualizationData,
  EvaluatorExecutionResult as ApiEvaluatorExecutionResult,
  EvaluatorVisualizationPayload as ApiEvaluatorVisualizationPayload,
  FloorPlan as ApiFloorPlan,
  FloorPlanEvent as ApiFloorPlanEvent,
  FloorPlanOpening as ApiFloorPlanOpening,
  FloorPlanPayload as ApiFloorPlanPayload,
  FloorPlanRoom as ApiFloorPlanRoom,
  FloorPlanScoring as ApiFloorPlanScoring,
  GenerationCancellationResponse as ApiGenerationCancellationResponse,
  GenerationErrorEvent as ApiGenerationErrorEvent,
  GenerationRequest as ApiGenerationRequest,
  GenerationResponse as ApiGenerationResponse,
  GenerationRoomRequest as ApiGenerationRoomRequest,
  GenerationSseEvent as ApiGenerationSseEvent,
  InwardRecessVisualizationData as ApiInwardRecessVisualizationData,
  Point as ApiPoint,
  Polygon as ApiPolygon,
  ProgressEvent as ApiProgressEvent,
  ProgressPayload as ApiProgressPayload,
  RoomMetadata as ApiRoomMetadata,
  ScoreFinding as ApiScoreFinding,
  ScoreMetric as ApiScoreMetric,
  ScoringGroupResult as ApiScoringGroupResult,
  StatusEvent as ApiStatusEvent,
  StatusPayload as ApiStatusPayload,
  StreamErrorPayload as ApiStreamErrorPayload,
} from "./floor-plan.api.types";
import {
  apiAreaToProjectArea,
  apiLengthToProjectLength,
  projectAreaToApiArea,
  projectLengthToApiLength,
} from "../measurement";

const toApiPoint = (point: Point): ApiPoint => ({
  x: projectLengthToApiLength(point.x),
  y: projectLengthToApiLength(point.y),
});

const fromApiPoint = (point: ApiPoint): Point => ({
  x: apiLengthToProjectLength(point.x),
  y: apiLengthToProjectLength(point.y),
});

const toApiPolygon = (polygon: Polygon): ApiPolygon => ({
  points: polygon.points.map(toApiPoint),
});

const fromApiPolygon = (polygon: ApiPolygon): Polygon => ({
  points: polygon.points.map(fromApiPoint),
});

const toApiGenerationRoom = (
  room: GenerationRoom,
): ApiGenerationRoomRequest => ({
  room_type: room.roomType,
  id: room.id,
  name: room.name,
  requested_size: room.requestedSize,
});

const fromApiGenerationRoom = (
  room: ApiGenerationRoomRequest,
): GenerationRoom => ({
  roomType: room.room_type,
  id: room.id,
  name: room.name,
  requestedSize: room.requested_size,
});

export const fromGenerationCancellationApiResponse = (
  response: ApiGenerationCancellationResponse,
): GenerationCancellationResult => ({
  jobId: response.job_id,
  status: response.status,
});

export const toFloorPlanGenerationApiRequest = (
  request: FloorPlanGenerationRequest,
): ApiGenerationRequest => ({
  floor_limits: {
    max_width: projectLengthToApiLength(request.floorLimits.maxWidth),
    max_length: projectLengthToApiLength(request.floorLimits.maxLength),
  },
  aspect_ratio: request.aspectRatio,
  rooms: request.rooms.map(toApiGenerationRoom),
});

export const fromFloorPlanGenerationApiRequest = (
  request: ApiGenerationRequest,
): FloorPlanGenerationRequest => ({
  floorLimits: {
    maxWidth: apiLengthToProjectLength(request.floor_limits.max_width),
    maxLength: apiLengthToProjectLength(request.floor_limits.max_length),
  },
  aspectRatio: request.aspect_ratio,
  rooms: request.rooms.map(fromApiGenerationRoom),
});

const toApiRoomMetadata = (metadata: RoomMetadata): ApiRoomMetadata => ({
  source_room_ids: [...metadata.sourceRoomIds],
  applied_transformations: [...metadata.appliedTransformations],
});

const fromApiRoomMetadata = (metadata: ApiRoomMetadata): RoomMetadata => ({
  sourceRoomIds: [...metadata.source_room_ids],
  appliedTransformations: [...metadata.applied_transformations],
});

const toApiFloorPlanRoom = (room: FloorPlanRoom): ApiFloorPlanRoom => ({
  id: room.id,
  room_type: room.roomType,
  name: room.name,
  boundary: toApiPolygon(room.boundary),
  role: room.role,
  parent_room_id: room.parentRoomId,
  metadata: toApiRoomMetadata(room.metadata),
});

const fromApiFloorPlanRoom = (room: ApiFloorPlanRoom): FloorPlanRoom => ({
  id: room.id,
  roomType: room.room_type,
  name: room.name,
  boundary: fromApiPolygon(room.boundary),
  role: room.role,
  parentRoomId: room.parent_room_id,
  metadata: fromApiRoomMetadata(room.metadata),
});

const toApiFloorPlanOpening = (
  opening: FloorPlanOpening,
): ApiFloorPlanOpening => ({
  id: opening.id,
  opening_type: opening.openingType,
  purpose: opening.purpose,
  start: toApiPoint(opening.start),
  end: toApiPoint(opening.end),
  connected_room_ids: [...opening.connectedRoomIds],
});

const fromApiFloorPlanOpening = (
  opening: ApiFloorPlanOpening,
): FloorPlanOpening => ({
  id: opening.id,
  openingType: opening.opening_type,
  purpose: opening.purpose,
  start: fromApiPoint(opening.start),
  end: fromApiPoint(opening.end),
  connectedRoomIds: [...opening.connected_room_ids],
});

export const toFloorPlanApiModel = (floorPlan: FloorPlan): ApiFloorPlan => ({
  boundary: toApiPolygon(floorPlan.boundary),
  rooms: floorPlan.rooms.map(toApiFloorPlanRoom),
  openings: floorPlan.openings.map(toApiFloorPlanOpening),
  identity_redirects: { ...floorPlan.identityRedirects },
  applied_transformations: [...floorPlan.appliedTransformations],
});

export const fromFloorPlanApiModel = (floorPlan: ApiFloorPlan): FloorPlan => ({
  boundary: fromApiPolygon(floorPlan.boundary),
  rooms: floorPlan.rooms.map(fromApiFloorPlanRoom),
  openings: floorPlan.openings.map(fromApiFloorPlanOpening),
  identityRedirects: { ...floorPlan.identity_redirects },
  appliedTransformations: [...floorPlan.applied_transformations],
});

const toApiScoreMetric = (metric: ScoreMetric): ApiScoreMetric => ({
  name: metric.name,
  value: metric.value,
  unit: metric.unit,
});

const fromApiScoreMetric = (metric: ApiScoreMetric): ScoreMetric => ({
  name: metric.name,
  value: metric.value,
  unit: metric.unit,
});

const toApiScoreFinding = (finding: ScoreFinding): ApiScoreFinding => ({
  code: finding.code,
  message: finding.message,
  severity: finding.severity,
  subject_ids: [...finding.subjectIds],
  metrics: finding.metrics.map(toApiScoreMetric),
});

const fromApiScoreFinding = (finding: ApiScoreFinding): ScoreFinding => ({
  code: finding.code,
  message: finding.message,
  severity: finding.severity,
  subjectIds: [...finding.subject_ids],
  metrics: finding.metrics.map(fromApiScoreMetric),
});

const toApiScoringGroupResult = (
  result: ScoringGroupResult,
): ApiScoringGroupResult => ({
  group_key: result.groupKey,
  status: result.status,
  normalized_maximum: result.normalizedMaximum,
  raw_score: result.rawScore,
  contribution: result.contribution,
});

const fromApiScoringGroupResult = (
  result: ApiScoringGroupResult,
): ScoringGroupResult => ({
  groupKey: result.group_key,
  status: result.status,
  normalizedMaximum: result.normalized_maximum,
  rawScore: result.raw_score,
  contribution: result.contribution,
});

const toApiEnclosedVoids = (
  payload: EnclosedVoidsVisualizationData,
): ApiEnclosedVoidsVisualizationData => ({
  area_tolerance: projectAreaToApiArea(payload.areaTolerance),
  voids: payload.voids.map((item) => ({
    points: item.points.map(([x, y]) => [
      projectLengthToApiLength(x),
      projectLengthToApiLength(y),
    ]),
    area: projectAreaToApiArea(item.area),
    affects_score: item.affectsScore,
  })),
});

const fromApiEnclosedVoids = (
  payload: ApiEnclosedVoidsVisualizationData,
): EnclosedVoidsVisualizationData => ({
  kind: "enclosed_voids",
  areaTolerance: apiAreaToProjectArea(payload.area_tolerance),
  voids: payload.voids.map((item) => ({
    points: item.points.map(([x, y]) => [
      apiLengthToProjectLength(x),
      apiLengthToProjectLength(y),
    ]),
    area: apiAreaToProjectArea(item.area),
    affectsScore: item.affects_score,
  })),
});

const toApiInwardRecess = (
  payload: InwardRecessVisualizationData,
): ApiInwardRecessVisualizationData => ({
  maximum_length: projectLengthToApiLength(payload.maximumLength),
  tolerance: projectLengthToApiLength(payload.tolerance),
  pockets: payload.pockets.map((pocket) => ({
    pocket_index: pocket.pocketIndex,
    points: pocket.points.map(([x, y]) => [
      projectLengthToApiLength(x),
      projectLengthToApiLength(y),
    ]),
    measured_length: projectLengthToApiLength(pocket.measuredLength),
    violates_maximum: pocket.violatesMaximum,
  })),
});

const fromApiInwardRecess = (
  payload: ApiInwardRecessVisualizationData,
): InwardRecessVisualizationData => ({
  kind: "inward_recess",
  maximumLength: apiLengthToProjectLength(payload.maximum_length),
  tolerance: apiLengthToProjectLength(payload.tolerance),
  pockets: payload.pockets.map((pocket) => ({
    pocketIndex: pocket.pocket_index,
    points: pocket.points.map(([x, y]) => [
      apiLengthToProjectLength(x),
      apiLengthToProjectLength(y),
    ]),
    measuredLength: apiLengthToProjectLength(pocket.measured_length),
    violatesMaximum: pocket.violates_maximum,
  })),
});

const toApiVisualizationPayload = (
  payload: EvaluatorVisualizationPayload,
): ApiEvaluatorVisualizationPayload => {
  if (payload === null) {
    return null;
  }

  return payload.kind === "enclosed_voids"
    ? toApiEnclosedVoids(payload)
    : toApiInwardRecess(payload);
};

const fromApiVisualizationPayload = (
  payload: ApiEvaluatorVisualizationPayload,
): EvaluatorVisualizationPayload => {
  if (payload === null) {
    return null;
  }

  return "voids" in payload
    ? fromApiEnclosedVoids(payload)
    : fromApiInwardRecess(payload);
};

const toApiEvaluatorResult = (
  result: EvaluatorExecutionResult,
): ApiEvaluatorExecutionResult => ({
  evaluator_key: result.evaluatorKey,
  group_key: result.groupKey,
  status: result.status,
  raw_score: result.rawScore,
  configured_weight: result.configuredWeight,
  normalized_weight: result.normalizedWeight,
  contribution: result.contribution,
  threshold: result.threshold,
  passed_threshold: result.passedThreshold,
  findings: result.findings.map(toApiScoreFinding),
  metrics: result.metrics.map(toApiScoreMetric),
  visualization_payload: toApiVisualizationPayload(result.visualizationPayload),
});

const fromApiEvaluatorResult = (
  result: ApiEvaluatorExecutionResult,
): EvaluatorExecutionResult => ({
  evaluatorKey: result.evaluator_key,
  groupKey: result.group_key,
  status: result.status,
  rawScore: result.raw_score,
  configuredWeight: result.configured_weight,
  normalizedWeight: result.normalized_weight,
  contribution: result.contribution,
  threshold: result.threshold,
  passedThreshold: result.passed_threshold,
  findings: result.findings.map(fromApiScoreFinding),
  metrics: result.metrics.map(fromApiScoreMetric),
  visualizationPayload: fromApiVisualizationPayload(
    result.visualization_payload,
  ),
});

const toApiFloorPlanScoring = (
  scoring: FloorPlanScoring,
): ApiFloorPlanScoring => ({
  total_score: scoring.totalScore,
  passed_critical: scoring.passedCritical,
  critical_failure:
    scoring.criticalFailure === null
      ? null
      : toApiScoreFinding(scoring.criticalFailure),
  group_results: scoring.groupResults.map(toApiScoringGroupResult),
  evaluator_results: scoring.evaluatorResults.map(toApiEvaluatorResult),
  findings: scoring.findings.map(toApiScoreFinding),
});

const fromApiFloorPlanScoring = (
  scoring: ApiFloorPlanScoring,
): FloorPlanScoring => ({
  totalScore: scoring.total_score,
  passedCritical: scoring.passed_critical,
  criticalFailure:
    scoring.critical_failure === null
      ? null
      : fromApiScoreFinding(scoring.critical_failure),
  groupResults: scoring.group_results.map(fromApiScoringGroupResult),
  evaluatorResults: scoring.evaluator_results.map(fromApiEvaluatorResult),
  findings: scoring.findings.map(fromApiScoreFinding),
});

export const toGenerationApiResponse = (
  response: GenerationResponse,
): ApiGenerationResponse => ({
  floor_plan: toFloorPlanApiModel(response.floorPlan),
  scoring: toApiFloorPlanScoring(response.scoring),
});

export const fromGenerationApiResponse = (
  response: ApiGenerationResponse,
): GenerationResponse => ({
  floorPlan: fromFloorPlanApiModel(response.floor_plan),
  scoring: fromApiFloorPlanScoring(response.scoring),
});

const toApiStatusPayload = (payload: StatusPayload): ApiStatusPayload => ({
  status: payload.status,
});

const fromApiStatusPayload = (payload: ApiStatusPayload): StatusPayload => ({
  status: payload.status,
});

const toApiCandidateHint = (hint: CandidateHint): ApiCandidateHint => ({
  room_id: hint.roomId,
  x: projectLengthToApiLength(hint.x),
  y: projectLengthToApiLength(hint.y),
  room_type: hint.roomType,
  hint_index: hint.hintIndex,
});

const fromApiCandidateHint = (hint: ApiCandidateHint): CandidateHint => ({
  roomId: hint.room_id,
  x: apiLengthToProjectLength(hint.x),
  y: apiLengthToProjectLength(hint.y),
  roomType: hint.room_type,
  hintIndex: hint.hint_index,
});

const toApiCandidateTrialPayload = (
  payload: CandidateTrialPayload,
): ApiCandidateTrialPayload => ({
  trial_number: payload.trialNumber,
  trial_limit: payload.trialLimit,
  candidate_hints: payload.candidateHints.map(toApiCandidateHint),
});

const fromApiCandidateTrialPayload = (
  payload: ApiCandidateTrialPayload,
): CandidateTrialPayload => ({
  trialNumber: payload.trial_number,
  trialLimit: payload.trial_limit,
  candidateHints: payload.candidate_hints.map(fromApiCandidateHint),
});

const toApiProgressPayload = (
  payload: ProgressPayload,
): ApiProgressPayload => ({
  stage: payload.stage,
  trial_number: payload.trialNumber,
  trial_limit: payload.trialLimit,
  elapsed_ms: payload.elapsedMs,
  timeout_ms: payload.timeoutMs,
});

const fromApiProgressPayload = (
  payload: ApiProgressPayload,
): ProgressPayload => ({
  stage: payload.stage,
  trialNumber: payload.trial_number,
  trialLimit: payload.trial_limit,
  elapsedMs: payload.elapsed_ms,
  timeoutMs: payload.timeout_ms,
});

const toApiFloorPlanPayload = (
  payload: FloorPlanPayload,
): ApiFloorPlanPayload => ({
  classification: payload.classification,
  trial_number: payload.trialNumber,
  candidate_id: payload.candidateId,
  solver_run_id: payload.solverRunId,
  score: payload.score,
  passed_critical: payload.passedCritical,
  floor_plan: toFloorPlanApiModel(payload.floorPlan),
});

const fromApiFloorPlanPayload = (
  payload: ApiFloorPlanPayload,
): FloorPlanPayload => ({
  classification: payload.classification,
  trialNumber: payload.trial_number,
  candidateId: payload.candidate_id,
  solverRunId: payload.solver_run_id,
  score: payload.score,
  passedCritical: payload.passed_critical,
  floorPlan: fromFloorPlanApiModel(payload.floor_plan),
});

const toApiCompletedPayload = (
  payload: CompletedPayload,
): ApiCompletedPayload => ({
  outcome: payload.outcome,
  final_floor_plan_sequence: payload.finalFloorPlanSequence,
  elapsed_ms: payload.elapsedMs,
});

const fromApiCompletedPayload = (
  payload: ApiCompletedPayload,
): CompletedPayload => ({
  outcome: payload.outcome,
  finalFloorPlanSequence: payload.final_floor_plan_sequence,
  elapsedMs: payload.elapsed_ms,
});

const toApiCancelledPayload = (
  payload: CancelledPayload,
): ApiCancelledPayload => ({
  reason: payload.reason,
});

const fromApiCancelledPayload = (
  payload: ApiCancelledPayload,
): CancelledPayload => ({
  reason: payload.reason,
});

const toApiStreamErrorPayload = (
  payload: StreamErrorPayload,
): ApiStreamErrorPayload => ({
  stage: payload.stage,
  code: payload.code,
  message: payload.message,
  details: payload.details,
  recoverable: payload.recoverable,
});

const fromApiStreamErrorPayload = (
  payload: ApiStreamErrorPayload,
): StreamErrorPayload => ({
  stage: payload.stage,
  code: payload.code,
  message: payload.message,
  details: payload.details,
  recoverable: payload.recoverable,
});

export const fromGenerationApiEvent = (
  event: ApiGenerationSseEvent,
): GenerationSseEvent => {
  switch (event.event) {
    case "status":
      return {
        schemaVersion: event.schema_version,
        sequence: event.sequence,
        timestamp: event.timestamp,
        jobId: event.job_id,
        event: event.event,
        payload: fromApiStatusPayload(event.payload),
      } satisfies StatusEvent;

    case "candidate_trial":
      return {
        schemaVersion: event.schema_version,
        sequence: event.sequence,
        timestamp: event.timestamp,
        jobId: event.job_id,
        event: event.event,
        payload: fromApiCandidateTrialPayload(event.payload),
      } satisfies CandidateTrialEvent;

    case "progress":
      return {
        schemaVersion: event.schema_version,
        sequence: event.sequence,
        timestamp: event.timestamp,
        jobId: event.job_id,
        event: event.event,
        payload: fromApiProgressPayload(event.payload),
      } satisfies ProgressEvent;

    case "floor_plan":
      return {
        schemaVersion: event.schema_version,
        sequence: event.sequence,
        timestamp: event.timestamp,
        jobId: event.job_id,
        event: event.event,
        payload: fromApiFloorPlanPayload(event.payload),
      } satisfies FloorPlanEvent;

    case "completed":
      return {
        schemaVersion: event.schema_version,
        sequence: event.sequence,
        timestamp: event.timestamp,
        jobId: event.job_id,
        event: event.event,
        payload: fromApiCompletedPayload(event.payload),
      } satisfies CompletedEvent;

    case "cancelled":
      return {
        schemaVersion: event.schema_version,
        sequence: event.sequence,
        timestamp: event.timestamp,
        jobId: event.job_id,
        event: event.event,
        payload: fromApiCancelledPayload(event.payload),
      } satisfies CancelledEvent;

    case "error":
      return {
        schemaVersion: event.schema_version,
        sequence: event.sequence,
        timestamp: event.timestamp,
        jobId: event.job_id,
        event: event.event,
        payload: fromApiStreamErrorPayload(event.payload),
      } satisfies GenerationErrorEvent;
  }
};

export const toGenerationApiEvent = (
  event: GenerationSseEvent,
): ApiGenerationSseEvent => {
  switch (event.event) {
    case "status":
      return {
        schema_version: event.schemaVersion,
        sequence: event.sequence,
        timestamp: event.timestamp,
        job_id: event.jobId,
        event: event.event,
        payload: toApiStatusPayload(event.payload),
      } satisfies ApiStatusEvent;

    case "candidate_trial":
      return {
        schema_version: event.schemaVersion,
        sequence: event.sequence,
        timestamp: event.timestamp,
        job_id: event.jobId,
        event: event.event,
        payload: toApiCandidateTrialPayload(event.payload),
      } satisfies ApiCandidateTrialEvent;

    case "progress":
      return {
        schema_version: event.schemaVersion,
        sequence: event.sequence,
        timestamp: event.timestamp,
        job_id: event.jobId,
        event: event.event,
        payload: toApiProgressPayload(event.payload),
      } satisfies ApiProgressEvent;

    case "floor_plan":
      return {
        schema_version: event.schemaVersion,
        sequence: event.sequence,
        timestamp: event.timestamp,
        job_id: event.jobId,
        event: event.event,
        payload: toApiFloorPlanPayload(event.payload),
      } satisfies ApiFloorPlanEvent;

    case "completed":
      return {
        schema_version: event.schemaVersion,
        sequence: event.sequence,
        timestamp: event.timestamp,
        job_id: event.jobId,
        event: event.event,
        payload: toApiCompletedPayload(event.payload),
      } satisfies ApiCompletedEvent;

    case "cancelled":
      return {
        schema_version: event.schemaVersion,
        sequence: event.sequence,
        timestamp: event.timestamp,
        job_id: event.jobId,
        event: event.event,
        payload: toApiCancelledPayload(event.payload),
      } satisfies ApiCancelledEvent;

    case "error":
      return {
        schema_version: event.schemaVersion,
        sequence: event.sequence,
        timestamp: event.timestamp,
        job_id: event.jobId,
        event: event.event,
        payload: toApiStreamErrorPayload(event.payload),
      } satisfies ApiGenerationErrorEvent;
  }
};
