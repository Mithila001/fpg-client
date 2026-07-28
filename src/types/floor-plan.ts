import type { Point, Polygon } from "./geometry";
import type { ProjectArea, ProjectLength } from "./measurement";

export const ROOM_TYPES = [
  "bedroom",
  "bathroom",
  "attached_bathroom",
  "living_room",
  "kitchen",
  "dining_room",
  "hallway",
  "veranda",
  "garage",
  "open_area",
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export interface FloorLimits {
  maxWidth: ProjectLength;
  maxLength: ProjectLength;
}

export interface GenerationRoom {
  roomType: RoomType;
  id?: string | null;
  name?: string | null;
  requestedSize?: string | null;
  required?: boolean;
}

export interface FloorPlanGenerationRequest {
  floorLimits: FloorLimits;
  aspectRatio: number | string;
  rooms: GenerationRoom[];
}

export const ROOM_ROLES = ["standard", "solver_placeholder"] as const;
export type RoomRole = (typeof ROOM_ROLES)[number];

export interface RoomMetadata {
  sourceRoomIds: string[];
  appliedTransformations: string[];
}

export interface FloorPlanRoom {
  id: string;
  roomType: RoomType;
  name: string;
  boundary: Polygon;
  role: RoomRole;
  parentRoomId: string | null;
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
  openingType: OpeningType;
  purpose: OpeningPurpose;
  start: Point;
  end: Point;
  connectedRoomIds: string[];
}

export interface FloorPlan {
  boundary: Polygon;
  rooms: FloorPlanRoom[];
  openings: FloorPlanOpening[];
  identityRedirects: Record<string, string>;
  appliedTransformations: string[];
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
  subjectIds: string[];
  metrics: ScoreMetric[];
}

export interface ScoringGroupResult {
  groupKey: string;
  status: GroupStatus;
  normalizedMaximum: number;
  rawScore: number | null;
  contribution: number;
}

export interface EnclosedVoid {
  points: Array<[ProjectLength, ProjectLength]>;
  area: ProjectArea;
  affectsScore: boolean;
}

export interface EnclosedVoidsVisualizationData {
  kind: "enclosed_voids";
  areaTolerance: ProjectArea;
  voids: EnclosedVoid[];
}

export interface InwardRecessPocket {
  pocketIndex: number;
  points: Array<[ProjectLength, ProjectLength]>;
  measuredLength: ProjectLength;
  violatesMaximum: boolean;
}

export interface InwardRecessVisualizationData {
  kind: "inward_recess";
  maximumLength: ProjectLength;
  tolerance: ProjectLength;
  pockets: InwardRecessPocket[];
}

export type EvaluatorVisualizationPayload =
  | EnclosedVoidsVisualizationData
  | InwardRecessVisualizationData
  | null;

export interface EvaluatorExecutionResult {
  evaluatorKey: string;
  groupKey: string;
  status: EvaluationStatus;
  rawScore: number | null;
  configuredWeight: number;
  normalizedWeight: number;
  contribution: number;
  threshold: number | null;
  passedThreshold: boolean | null;
  findings: ScoreFinding[];
  metrics: ScoreMetric[];
  visualizationPayload: EvaluatorVisualizationPayload;
}

export interface FloorPlanScoring {
  totalScore: number;
  passedCritical: boolean;
  criticalFailure: ScoreFinding | null;
  groupResults: ScoringGroupResult[];
  evaluatorResults: EvaluatorExecutionResult[];
  findings: ScoreFinding[];
}

export interface GenerationResponse {
  floorPlan: FloorPlan;
  scoring: FloorPlanScoring;
}

export const GENERATION_EVENT_NAMES = [
  "status",
  "candidate_trial",
  "progress",
  "floor_plan",
  "completed",
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
  roomId: string;
  x: ProjectLength;
  y: ProjectLength;
  roomType: RoomType | null;
  hintIndex: number;
}

export interface CandidateTrialPayload {
  trialNumber: number;
  trialLimit: number;
  candidateHints: CandidateHint[];
}

export interface ProgressPayload {
  stage: string;
  trialNumber: number;
  trialLimit: number;
  elapsedMs: number;
  timeoutMs: number;
}

export interface FloorPlanPayload {
  classification: FloorPlanClassification;
  trialNumber: number | null;
  candidateId: number;
  solverRunId: number;
  score: number;
  passedCritical: boolean;
  floorPlan: FloorPlan;
}

export interface CompletedPayload {
  outcome: CompletionOutcome;
  finalFloorPlanSequence: number | null;
  elapsedMs: number;
}

export interface StreamErrorPayload {
  stage: string;
  code: string;
  message: string;
  recoverable: boolean;
}

export interface GenerationEventEnvelope<
  TEvent extends GenerationEventName,
  TPayload,
> {
  schemaVersion: 1;
  sequence: number;
  timestamp: string;
  jobId: string;
  event: TEvent;
  payload: TPayload;
}

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
  | GenerationErrorEvent;

export interface FloorPlanGenerationResult {
  jobId: string;
  completedEvent: CompletedEvent;
  selectedFloorPlanEvent: FloorPlanEvent;
  selectedFloorPlan: FloorPlanPayload;
}
