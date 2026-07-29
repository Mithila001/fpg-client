import type {
  GenerationCancellationResult,
  RoomSizeConstraintsResult,
} from "../../types";
import { createApiUrl } from "../http";
import { FloorPlanServiceError } from "./floor-plan.errors";
import {
  fromGenerationCancellationApiResponse,
  fromRoomSizeConstraintsApiResponse,
} from "./floor-plan.mapper";
import type { FloorPlanRequestOptions } from "./floor-plan.service.types";
import {
  extractGenerationHttpError,
  parseGenerationCancellationResponse,
  parseRoomSizeConstraintsResponse,
  readGenerationHttpErrorBody,
} from "./floor-plan.validators";

const configuredConstraintsPath =
  import.meta.env.VITE_ROOM_SIZE_CONSTRAINTS_PATH?.trim();

export const ROOM_SIZE_CONSTRAINTS_PATH =
  configuredConstraintsPath && configuredConstraintsPath.length > 0
    ? configuredConstraintsPath
    : "/generation/room-size-constraints";

const configuredStreamPath = import.meta.env.VITE_FLOOR_PLAN_STREAM_PATH?.trim();

export const GENERATION_STREAM_CANCELLATION_PATH =
  configuredStreamPath && configuredStreamPath.length > 0
    ? configuredStreamPath
    : "/generation/stream";

const mergeHeaders = (
  defaults: Record<string, string>,
  customHeaders?: HeadersInit,
): Headers => {
  const headers = new Headers(defaults);
  if (customHeaders !== undefined) {
    new Headers(customHeaders).forEach((value, key) => headers.set(key, value));
  }
  return headers;
};

const isAbortError = (error: unknown): boolean =>
  typeof DOMException !== "undefined" &&
  error instanceof DOMException &&
  error.name === "AbortError";

const readJsonSuccessBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new FloorPlanServiceError({
      kind: "invalid_response",
      message: "The generation API returned a non-JSON success response.",
      status: response.status,
      details: { contentType },
    });
  }

  try {
    return (await response.json()) as unknown;
  } catch (error: unknown) {
    throw new FloorPlanServiceError({
      kind: "invalid_response",
      message: "The generation API returned invalid JSON.",
      status: response.status,
      cause: error,
    });
  }
};

const throwHttpError = async (
  response: Response,
  fallbackMessage: string,
  jobId?: string,
): Promise<never> => {
  const body = await readGenerationHttpErrorBody(response);
  const details = extractGenerationHttpError(body);

  throw new FloorPlanServiceError({
    kind: "api_error",
    message: details.message ?? fallbackMessage,
    status: response.status,
    jobId,
    code: details.code,
    stage: details.stage,
    details: body,
  });
};

export const getRoomSizeConstraints = async (
  options: FloorPlanRequestOptions = {},
): Promise<RoomSizeConstraintsResult> => {
  const fetchImplementation = options.fetchImplementation ?? fetch;

  let response: Response;
  try {
    response = await fetchImplementation(createApiUrl(ROOM_SIZE_CONSTRAINTS_PATH), {
      method: "GET",
      headers: mergeHeaders({ Accept: "application/json" }, options.headers),
      signal: options.signal,
    });
  } catch (error: unknown) {
    if (options.signal?.aborted || isAbortError(error)) {
      throw new FloorPlanServiceError({
        kind: "aborted",
        message: "The room-size constraints request was aborted.",
        cause: error,
      });
    }

    throw new FloorPlanServiceError({
      kind: "transport",
      message: "Unable to load generation room-size constraints.",
      cause: error,
    });
  }

  if (!response.ok) {
    return throwHttpError(
      response,
      `Room-size constraints request failed with HTTP status ${response.status}.`,
    );
  }

  const body = await readJsonSuccessBody(response);
  return fromRoomSizeConstraintsApiResponse(
    parseRoomSizeConstraintsResponse(body),
  );
};

export const cancelFloorPlanGeneration = async (
  jobId: string,
  options: FloorPlanRequestOptions = {},
): Promise<GenerationCancellationResult> => {
  const normalizedJobId = jobId.trim();
  if (normalizedJobId.length === 0) {
    throw new FloorPlanServiceError({
      kind: "invalid_request",
      message: "A generation job ID is required for cancellation.",
    });
  }

  const fetchImplementation = options.fetchImplementation ?? fetch;
  const path = `${GENERATION_STREAM_CANCELLATION_PATH.replace(/\/+$/, "")}/${encodeURIComponent(normalizedJobId)}`;

  let response: Response;
  try {
    response = await fetchImplementation(createApiUrl(path), {
      method: "DELETE",
      headers: mergeHeaders({ Accept: "application/json" }, options.headers),
      signal: options.signal,
    });
  } catch (error: unknown) {
    if (options.signal?.aborted || isAbortError(error)) {
      throw new FloorPlanServiceError({
        kind: "aborted",
        message: "The generation cancellation request was aborted.",
        jobId: normalizedJobId,
        cause: error,
      });
    }

    throw new FloorPlanServiceError({
      kind: "transport",
      message: "Unable to request generation cancellation.",
      jobId: normalizedJobId,
      cause: error,
    });
  }

  if (response.status !== 200 && response.status !== 202) {
    return throwHttpError(
      response,
      `Generation cancellation failed with HTTP status ${response.status}.`,
      normalizedJobId,
    );
  }

  const body = await readJsonSuccessBody(response);
  return fromGenerationCancellationApiResponse(
    parseGenerationCancellationResponse(body, normalizedJobId),
  );
};
