import type { GenerationConnectionState, GenerationSseEvent } from "../../types";

export interface FloorPlanEventSubscription { readonly closed: boolean; close(): void }
export interface FloorPlanEventHandlers {
  onConnectionChange?: (state: GenerationConnectionState) => void;
  onEvent: (event: GenerationSseEvent) => void;
  onError?: (error: Error) => void;
}
export interface FloorPlanRequestOptions { signal?: AbortSignal; fetchImplementation?: typeof fetch }
export interface FloorPlanEventOptions { eventSourceFactory?: (url: string) => EventSource }
