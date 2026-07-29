export const ROOM_TYPES = [
  "bedroom",
  "bathroom",
  "attached_bathroom",
  "living_room",
  "kitchen",
  "dining_room",
  "veranda",
  "garage",
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export interface FloorLimitsRequest {
  max_width: number;
  max_length: number;
}

export interface GenerationRoomRequest {
  room_type: RoomType;
  id?: string | null;
  name?: string | null;
  requested_size?: string | null;
}

export const GENERATION_CANCELLATION_STATUSES = [
  "cancellation_requested",
  "already_requested",
] as const;
export type GenerationCancellationStatus =
  (typeof GENERATION_CANCELLATION_STATUSES)[number];

export interface GenerationCancellationResponse {
  job_id: string;
  status: GenerationCancellationStatus;
}

export interface GenerationRequest {
  floor_limits: FloorLimitsRequest;
  aspect_ratio: number | string;
  rooms: GenerationRoomRequest[];
}

export type FloorPlanGenerationRequest = GenerationRequest;

export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  points: Point[];
}

export const ROOM_ROLES = ["standard", "solver_placeholder"] as const;
export type RoomRole = (typeof ROOM_ROLES)[number];

export interface RoomMetadata {
  source_room_ids: string[];
  applied_transformations: string[];
}

export interface FloorPlanRoom {
  id: string;
  room_type: string;
  name: string;
  boundary: Polygon;
  role: RoomRole;
  parent_room_id: string | null;
  metadata: RoomMetadata;
}

export const OPENING_TYPES = ["door", "window"] as const;
export type OpeningType = (typeof OPENING_TYPES)[number];

export const OPENING_PURPOSES = [
  "room_connection",
  "main_entrance",
  "secondary_entrance",
  "daylight",
] as const;
export type OpeningPurpose = (typeof OPENING_PURPOSES)[number];

export interface FloorPlanOpening {
  id: string;
  opening_type: OpeningType;
  purpose: OpeningPurpose;
  start: Point;
  end: Point;
  connected_room_ids: string[];
}

export interface FloorPlan {
  boundary: Polygon;
  rooms: FloorPlanRoom[];
  openings: FloorPlanOpening[];
  identity_redirects: Record<string, string>;
  applied_transformations: string[];
}

export const EVALUATION_STATUSES = [
  "completed",
  "not_applicable",
  "skipped",
] as const;
export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];

export const GROUP_STATUSES = [
  "completed",
  "failed",
  "not_applicable",
  "skipped",
] as const;
export type GroupStatus = (typeof GROUP_STATUSES)[number];

export const FINDING_SEVERITIES = ["info", "warning", "error"] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export interface ScoreMetric {
  name: string;
  value: number;
  unit: string | null;
}

export interface ScoreFinding {
  code: string;
  message: string;
  severity: FindingSeverity;
  subject_ids: string[];
  metrics: ScoreMetric[];
}

export interface ScoringGroupResult {
  group_key: string;
  status: GroupStatus;
  normalized_maximum: number;
  raw_score: number | null;
  contribution: number;
}

export interface EnclosedVoidsVisualizationData {
  area_tolerance: number;
  voids: Array<{
    points: Array<[number, number]>;
    area: number;
    affects_score: boolean;
  }>;
}

export interface InwardRecessVisualizationData {
  maximum_length: number;
  tolerance: number;
  pockets: Array<{
    pocket_index: number;
    points: Array<[number, number]>;
    measured_length: number;
    violates_maximum: boolean;
  }>;
}

export type EvaluatorVisualizationPayload =
  | EnclosedVoidsVisualizationData
  | InwardRecessVisualizationData
  | null;

export interface EvaluatorExecutionResult {
  evaluator_key: string;
  group_key: string;
  status: EvaluationStatus;
  raw_score: number | null;
  configured_weight: number;
  normalized_weight: number;
  contribution: number;
  threshold: number | null;
  passed_threshold: boolean | null;
  findings: ScoreFinding[];
  metrics: ScoreMetric[];
  visualization_payload: EvaluatorVisualizationPayload;
}

export interface FloorPlanScoring {
  total_score: number;
  passed_critical: boolean;
  critical_failure: ScoreFinding | null;
  group_results: ScoringGroupResult[];
  evaluator_results: EvaluatorExecutionResult[];
  findings: ScoreFinding[];
}

/** Backward-compatible alias for the previous placeholder scoring type. */
export type ScoringResult = FloorPlanScoring;

export interface GenerationResponse {
  floor_plan: FloorPlan;
  scoring: FloorPlanScoring;
}

export const GENERATION_STAGES = [
  "preprocessing",
  "candidate_search",
  "candidate_scoring",
  "solver",
  "refinement",
  "post_processing",
  "openings",
  "attempt_scoring",
  "scoring",
  "visualization",
  "final_validation",
] as const;
export type GenerationStage = (typeof GENERATION_STAGES)[number];

export interface GenerationErrorResponse {
  stage: GenerationStage | string;
  code: string;
  message: string;
  details: Record<string, unknown> | null;
}

export interface ValidationIssue {
  type: string;
  loc: Array<string | number>;
  msg: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface HttpValidationError {
  detail: ValidationIssue[];
}

/** Backward-compatible aliases. */
export type FastApiValidationIssue = ValidationIssue;
export type FastApiValidationErrorResponse = HttpValidationError;

export interface UnexpectedGenerationErrorResponse {
  message: string;
}

export type GenerationHttpErrorBody =
  | GenerationErrorResponse
  | HttpValidationError
  | UnexpectedGenerationErrorResponse
  | Record<string, unknown>
  | string
  | null;

export const GENERATION_EVENT_NAMES = [
  "status",
  "candidate_trial",
  "progress",
  "floor_plan",
  "completed",
  "cancelled",
  "error",
] as const;
export type GenerationEventName = (typeof GENERATION_EVENT_NAMES)[number];

export const GENERATION_STATUSES = [
  "job_started",
  "candidate_search_started",
  "floor_plan_generation_started",
  "usable_floor_plan_found",
  "presentable_floor_plan_found",
  "timeout_reached",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

export const FLOOR_PLAN_CLASSIFICATIONS = ["usable", "presentable"] as const;
export type FloorPlanClassification =
  (typeof FLOOR_PLAN_CLASSIFICATIONS)[number];

export const COMPLETION_OUTCOMES = [
  "presentable_plan_found",
  "best_usable_plan_returned",
] as const;
export type CompletionOutcome = (typeof COMPLETION_OUTCOMES)[number];

export interface StatusPayload {
  status: GenerationStatus;
}

export interface CandidateHint {
  room_id: string;
  x: number;
  y: number;
  room_type: string | null;
  hint_index: number;
}

export interface CandidateTrialPayload {
  trial_number: number;
  trial_limit: number;
  candidate_hints: CandidateHint[];
}

export interface ProgressPayload {
  stage: string;
  trial_number: number;
  trial_limit: number;
  elapsed_ms: number;
  timeout_ms: number;
}

export interface FloorPlanPayload {
  classification: FloorPlanClassification;
  trial_number: number | null;
  candidate_id: number;
  solver_run_id: number;
  score: number;
  passed_critical: boolean;
  floor_plan: FloorPlan;
}

/** Backward-compatible alias used by the disposable test page. */
export type FloorPlanEventPayload = FloorPlanPayload;

export interface CompletedPayload {
  outcome: CompletionOutcome;
  final_floor_plan_sequence: number | null;
  elapsed_ms: number;
}

export interface CancelledPayload {
  reason: string;
}

export interface StreamErrorPayload {
  stage: string;
  code: string;
  message: string;
  details: Record<string, unknown>;
  recoverable: boolean;
}

/** Backward-compatible alias. */
export type ErrorPayload = StreamErrorPayload;

export interface GenerationEventEnvelope<
  TEvent extends GenerationEventName,
  TPayload,
> {
  schema_version: 1;
  sequence: number;
  timestamp: string;
  job_id: string;
  event: TEvent;
  payload: TPayload;
}

/** Backward-compatible alias. */
export type StreamEnvelope<
  TEvent extends GenerationEventName,
  TPayload,
> = GenerationEventEnvelope<TEvent, TPayload>;

export type StatusEvent = GenerationEventEnvelope<"status", StatusPayload>;
export type CandidateTrialEvent = GenerationEventEnvelope<
  "candidate_trial",
  CandidateTrialPayload
>;
export type ProgressEvent = GenerationEventEnvelope<"progress", ProgressPayload>;
export type FloorPlanEvent = GenerationEventEnvelope<
  "floor_plan",
  FloorPlanPayload
>;
export type CompletedEvent = GenerationEventEnvelope<
  "completed",
  CompletedPayload
>;
export type CancelledEvent = GenerationEventEnvelope<
  "cancelled",
  CancelledPayload
>;
export type GenerationErrorEvent = GenerationEventEnvelope<
  "error",
  StreamErrorPayload
>;

export type GenerationSseEvent =
  | StatusEvent
  | CandidateTrialEvent
  | ProgressEvent
  | FloorPlanEvent
  | CompletedEvent
  | CancelledEvent
  | GenerationErrorEvent;

/** Backward-compatible alias. */
export type GenerationStreamEvent = GenerationSseEvent;
