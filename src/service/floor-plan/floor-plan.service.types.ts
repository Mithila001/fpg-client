import type {
  FloorPlanGenerationResult,
  GenerationSseEvent,
} from "../../types";

export type FloorPlanStreamCloseReason =
  | "completed"
  | "generation_error"
  | "cancelled"
  | "aborted";

export interface FloorPlanStreamHandlers {
  onOpen?: (jobId: string | null) => void;
  onEvent: (event: GenerationSseEvent) => void | Promise<void>;
  onClose?: (reason: FloorPlanStreamCloseReason) => void;
  onError?: (error: Error) => void;
}

export interface FloorPlanRequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  fetchImplementation?: typeof fetch;
}

export type FloorPlanStreamOptions = FloorPlanRequestOptions;

export interface FloorPlanEventStream {
  readonly closed: boolean;
  close(): void;
}

export interface FloorPlanGenerationSession {
  readonly jobId: string | null;
  readonly stream: FloorPlanEventStream;
  readonly completion: Promise<FloorPlanGenerationResult>;
}
