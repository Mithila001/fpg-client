import type {
  CandidateHint, FloorPlan, FloorPlanJobStatus, GenerationConnectionState,
  GenerationJobDescriptor, GenerationSseEvent, GenerationTimelineEntry,
} from "../../types";
import { candidateHintsFromEvent, floorPlanFromEvent } from "../../service/floor-plan";

export type GenerationViewState = "idle" | "queued" | "running" | "cancellation_requested" |
  "completed" | "failed" | "cancelled" | "timed_out" | "expired";
export interface GenerationRunState {
  view: GenerationViewState; descriptor: GenerationJobDescriptor | null;
  connection: GenerationConnectionState; lastSequence: number; message: string;
  stage: string | null; trialNumber: number | null; trialLimit: number | null;
  hints: CandidateHint[]; intermediatePlan: FloorPlan | null; status: FloorPlanJobStatus | null;
  timeline: GenerationTimelineEntry[]; warning: string | null; showBestAvailable: boolean;
}
export const initialGenerationState: GenerationRunState = {
  view: "idle", descriptor: null, connection: "idle", lastSequence: 0, message: "",
  stage: null, trialNumber: null, trialLimit: null, hints: [], intermediatePlan: null,
  status: null, timeline: [], warning: null, showBestAvailable: false,
};
const terminal = new Set(["completed", "failed", "cancelled", "timed_out"]);
const timelineEntry = (event: GenerationSseEvent): GenerationTimelineEntry => ({
  sequence: event.sequence, eventType: event.eventType, stage: event.stage, state: event.state,
  message: event.message, timestampUtc: event.timestampUtc, trialNumber: event.trialNumber,
  severity: event.eventType === "attempt_error" ? "warning" :
    event.eventType === "terminal" && event.state === "completed" ? "success" :
      event.eventType === "terminal" ? "error" :
        event.state === "accepted" || event.state === "completed" ? "success" : "info",
});
export type GenerationAction =
  | { type: "job_created"; descriptor: GenerationJobDescriptor }
  | { type: "connection"; connection: GenerationConnectionState }
  | { type: "event"; event: GenerationSseEvent }
  | { type: "status"; status: FloorPlanJobStatus }
  | { type: "expired"; message: string }
  | { type: "restore"; state: GenerationRunState }
  | { type: "show_best" }
  | { type: "reset" };

export const generationReducer = (state: GenerationRunState, action: GenerationAction): GenerationRunState => {
  switch (action.type) {
    case "reset": return initialGenerationState;
    case "restore": return action.state;
    case "show_best": return { ...state, showBestAvailable: true };
    case "connection": return { ...state, connection: action.connection };
    case "expired": return { ...state, view: "expired", connection: "closed", descriptor: null,
      intermediatePlan: null, hints: [], warning: action.message, message: action.message };
    case "job_created":
      return { ...initialGenerationState, view: action.descriptor.state, descriptor: action.descriptor,
        connection: "connecting", message: action.descriptor.state === "queued" ? "Waiting in the generation queue…" : "Starting generation…" };
    case "event": {
      const event = action.event;
      if (event.sequence <= state.lastSequence) return state;
      const hints = event.eventType === "candidate" && event.state === "generated"
        ? candidateHintsFromEvent(event) : state.hints;
      const plan = event.eventType === "floor_plan" ? floorPlanFromEvent(event) : null;
      const limit = typeof event.data.trial_limit === "number" ? event.data.trial_limit : state.trialLimit;
      const eventView = event.eventType === "job" &&
        (event.state === "queued" || event.state === "running" || event.state === "cancellation_requested")
        ? event.state : state.view;
      return { ...state, view: eventView, lastSequence: event.sequence, message: event.message,
        stage: event.stage, trialNumber: event.trialNumber ?? state.trialNumber, trialLimit: limit,
        hints: plan ? [] : hints, intermediatePlan: plan ?? state.intermediatePlan,
        warning: event.eventType === "attempt_error" ? (event.error?.message ?? event.message) : state.warning,
        timeline: [...state.timeline, timelineEntry(event)].slice(-150),
        connection: event.eventType === "terminal" ? "closed" : state.connection };
    }
    case "status": {
      const status = action.status; const isTerminal = terminal.has(status.state);
      return { ...state, status, view: status.state, connection: isTerminal ? "closed" : state.connection,
        message: status.error?.message ?? (status.state === "completed" ? "Your floor plan is ready." :
          status.state === "timed_out" ? "Generation reached its time limit." :
            status.state === "cancelled" ? "Generation was cancelled." :
              status.state === "failed" ? "Generation failed." : state.message),
        intermediatePlan: isTerminal ? null : state.intermediatePlan, hints: isTerminal ? [] : state.hints };
    }
  }
};

const STORAGE_KEY = "fpg.current-run.v2";
export const loadPersistedGeneration = (): GenerationRunState | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY); if (!value) return null;
    const parsed = JSON.parse(value) as GenerationRunState;
    return typeof parsed.lastSequence === "number" && typeof parsed.view === "string" ? parsed : null;
  } catch { return null; }
};
export const persistGeneration = (state: GenerationRunState): void => {
  try {
    if (state.view === "idle") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* Storage may be unavailable. */ }
};
