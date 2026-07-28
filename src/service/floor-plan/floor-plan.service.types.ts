import type {
  FloorPlanGenerationResult,
  GenerationSseEvent,
} from "../../types";

export type FloorPlanStreamCloseReason =
  | "completed"
  | "generation_error"
  | "aborted";

export interface FloorPlanStreamHandlers {
  onOpen?: (jobId: string | null) => void;
  onEvent: (event: GenerationSseEvent) => void | Promise<void>;
  onClose?: (reason: FloorPlanStreamCloseReason) => void;
  onError?: (error: Error) => void;
}

export interface FloorPlanStreamOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  fetchImplementation?: typeof fetch;
}

export interface FloorPlanEventStream {
  readonly closed: boolean;
  close(): void;
}

export interface FloorPlanGenerationSession {
  readonly jobId: string | null;
  readonly stream: FloorPlanEventStream;
  readonly completion: Promise<FloorPlanGenerationResult>;
}
