import type {
  FloorPlanGenerationRequest, FloorPlanJobStatus, GenerationCancellationResult, GenerationJobDescriptor,
} from "../../types";
import { createApiUrl, createServerUrl, readApiFailure, readResponseBody } from "../http";
import { FloorPlanServiceError } from "./floor-plan.errors";
import { parseGenerationEvent, parseJobDescriptor, parseJobStatus, toFloorPlanApiRequest } from "./floor-plan.mapper";
import type { FloorPlanEventHandlers, FloorPlanEventOptions, FloorPlanEventSubscription, FloorPlanRequestOptions } from "./floor-plan.service.types";

const JOBS_PATH = "/floor-plan-jobs";
const requestJson = async (url: string, init: RequestInit, options: FloorPlanRequestOptions): Promise<unknown> => {
  let response: Response;
  try { response = await (options.fetchImplementation ?? fetch)(url, { ...init, signal: options.signal }); }
  catch (cause) { throw new FloorPlanServiceError({ kind: "transport", message: "Unable to communicate with the floor-plan API.", cause }); }
  if (!response.ok) {
    const failure = await readApiFailure(response);
    throw new FloorPlanServiceError({ kind: "api_error", message: failure.message ?? `Floor-plan request failed with HTTP ${response.status}.`,
      status: response.status, code: failure.code, stage: failure.stage, details: failure.details ?? failure.body });
  }
  return readResponseBody(response);
};

export const createFloorPlanJob = async (request: FloorPlanGenerationRequest, options: FloorPlanRequestOptions = {}): Promise<GenerationJobDescriptor> => {
  const body = toFloorPlanApiRequest(request);
  if (body.floor_limits.max_width <= 0 || body.floor_limits.max_length <= 0 || body.rooms.length === 0) {
    throw new FloorPlanServiceError({ kind: "invalid_request", message: "Floor limits and at least one room are required." });
  }
  try {
    return parseJobDescriptor(await requestJson(createApiUrl(JOBS_PATH), {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body),
    }, options));
  } catch (cause) {
    if (cause instanceof FloorPlanServiceError) throw cause;
    throw new FloorPlanServiceError({ kind: "invalid_response", message: "The job creation response is invalid.", cause });
  }
};
export const getFloorPlanJob = async (statusUrl: string, options: FloorPlanRequestOptions = {}): Promise<FloorPlanJobStatus> => {
  try { return parseJobStatus(await requestJson(createServerUrl(statusUrl), { method: "GET", headers: { Accept: "application/json" } }, options)); }
  catch (cause) { if (cause instanceof FloorPlanServiceError) throw cause;
    throw new FloorPlanServiceError({ kind: "invalid_response", message: "The floor-plan job status is invalid.", cause }); }
};
export const cancelFloorPlanGeneration = async (job: Pick<GenerationJobDescriptor, "jobId" | "cancellationUrl">, options: FloorPlanRequestOptions = {}): Promise<GenerationCancellationResult> => {
  const value = await requestJson(createServerUrl(job.cancellationUrl), { method: "DELETE", headers: { Accept: "application/json" } }, options);
  if (typeof value !== "object" || value === null) throw new FloorPlanServiceError({ kind: "invalid_response", message: "Invalid cancellation response." });
  const result = value as Record<string, unknown>;
  if (result.status !== "cancellation_requested" && result.status !== "already_requested") throw new FloorPlanServiceError({ kind: "invalid_response", message: "Invalid cancellation status." });
  return { jobId: typeof result.job_id === "string" ? result.job_id : job.jobId, status: result.status };
};

export const subscribeToFloorPlanEvents = (
  job: Pick<GenerationJobDescriptor, "eventsUrl">, handlers: FloorPlanEventHandlers,
  options: FloorPlanEventOptions = {},
): FloorPlanEventSubscription => {
  const url = createServerUrl(job.eventsUrl);
  const source = options.eventSourceFactory?.(url) ?? new EventSource(url);
  let closed = false;
  handlers.onConnectionChange?.("connecting");
  source.onopen = () => handlers.onConnectionChange?.("open");
  source.onerror = () => { if (!closed) handlers.onConnectionChange?.("reconnecting"); };
  for (const eventType of ["job", "stage", "candidate", "floor_plan", "attempt_error", "terminal"] as const) {
    source.addEventListener(eventType, (message) => {
      if (closed) return;
      try {
        const event = parseGenerationEvent(JSON.parse((message as MessageEvent<string>).data) as unknown, eventType);
        handlers.onEvent(event);
        if (event.eventType === "terminal") { closed = true; source.close(); handlers.onConnectionChange?.("closed"); }
      } catch (cause) {
        handlers.onError?.(new FloorPlanServiceError({ kind: "sse_protocol", message: "An invalid generation event was received.", eventName: eventType, cause }));
      }
    });
  }
  return { get closed() { return closed; }, close() { if (closed) return; closed = true; source.close(); handlers.onConnectionChange?.("closed"); } };
};
