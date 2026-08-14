import type { Point, Polygon } from "./geometry";
import type { ProjectLength } from "./measurement";

export const ROOM_TYPES = [
  "bedroom", "bathroom", "attached_bathroom", "living_room", "kitchen",
  "dining_room", "hallway", "veranda", "garage",
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export interface FloorLimits { maxWidth: ProjectLength; maxLength: ProjectLength }
export interface GenerationRoom {
  roomType: RoomType;
  id?: string | null;
  name?: string | null;
  requestedSize?: string | null;
}
export interface FloorPlanGenerationRequest {
  floorLimits: FloorLimits;
  aspectRatio: number | string;
  rooms: GenerationRoom[];
}

export const ROOM_ROLES = ["standard", "solver_placeholder"] as const;
export type RoomRole = (typeof ROOM_ROLES)[number];
export interface RoomMetadata { sourceRoomIds: string[]; appliedTransformations: string[] }
export interface FloorPlanRoom {
  id: string; roomType: string; name: string; boundary: Polygon; role: RoomRole;
  parentRoomId: string | null; metadata: RoomMetadata;
}
export const OPENING_TYPES = ["door", "window"] as const;
export type OpeningType = (typeof OPENING_TYPES)[number];
export const OPENING_PURPOSES = ["room_connection", "main_entrance", "secondary_entrance", "daylight"] as const;
export type OpeningPurpose = (typeof OPENING_PURPOSES)[number];
export interface FloorPlanOpening {
  id: string; openingType: OpeningType; purpose: OpeningPurpose; start: Point; end: Point;
  connectedRoomIds: string[];
}
export interface FloorPlan {
  boundary: Polygon; rooms: FloorPlanRoom[]; openings: FloorPlanOpening[];
  identityRedirects: Record<string, string>; appliedTransformations: string[];
}

export type FindingSeverity = "info" | "warning" | "error";
export interface ScoreFinding {
  code: string; message: string; severity: FindingSeverity; subjectIds: string[];
  metrics: Record<string, number> | Array<{ name: string; value: number; unit?: string | null }>;
}
export interface FloorPlanScoring {
  totalScore: number; passedCritical: boolean; criticalFailure: ScoreFinding | null;
}
export type FloorPlanClassification = "presentable" | "usable";
export type CompletionOutcome = "presentable_plan_found" | "best_usable_plan_returned";
export interface FloorPlanResult {
  floorPlan: FloorPlan; scoring: FloorPlanScoring; classification: FloorPlanClassification;
  outcome: CompletionOutcome;
}

export const JOB_STATES = ["queued", "running", "cancellation_requested", "completed", "failed", "cancelled", "timed_out"] as const;
export type FloorPlanJobState = (typeof JOB_STATES)[number];
export interface GenerationJobDescriptor {
  jobId: string; state: FloorPlanJobState; statusUrl: string; eventsUrl: string;
  cancellationUrl: string;
}
export interface GenerationCancellationResult {
  jobId: string; status: "cancellation_requested" | "already_requested";
}
export interface GenerationErrorPayload {
  code: string; message: string; recoverable?: boolean; details: Record<string, unknown>;
}
export interface FloorPlanJobStatus {
  jobId: string; state: FloorPlanJobState; createdAt: string; startedAt: string | null;
  completedAt: string | null; result: FloorPlanResult | null;
  bestAvailable: FloorPlanResult | null; error: GenerationErrorPayload | null;
}

export const GENERATION_EVENT_NAMES = ["job", "stage", "candidate", "floor_plan", "attempt_error", "terminal"] as const;
export type GenerationEventName = (typeof GENERATION_EVENT_NAMES)[number];
export interface CandidateHint {
  roomId: string; x: ProjectLength; y: ProjectLength; roomType: string | null; hintIndex: number;
}
export interface GenerationSseEvent {
  schemaVersion: "1.0"; jobId: string; sequence: number; eventType: GenerationEventName;
  stage: string; state: string; message: string; data: Record<string, unknown>;
  error: GenerationErrorPayload | null; trialNumber: number | null;
  candidateId: number | string | null; timestampUtc: string;
}
export type GenerationConnectionState = "idle" | "connecting" | "open" | "reconnecting" | "closed";
export interface GenerationTimelineEntry {
  sequence: number; eventType: GenerationEventName; stage: string; state: string;
  message: string; timestampUtc: string; trialNumber: number | null;
  severity: "info" | "success" | "warning" | "error";
}
