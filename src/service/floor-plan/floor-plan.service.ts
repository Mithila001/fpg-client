import type {
  CompletedEvent,
  FloorPlanEvent,
  FloorPlanGenerationRequest,
  FloorPlanGenerationResult,
  GenerationErrorEvent,
} from "../../types";
import { createApiUrl } from "../http";
import { consumeSseStream } from "../transport";
import { FloorPlanServiceError } from "./floor-plan.errors";
import {
  fromGenerationApiEvent,
  toFloorPlanGenerationApiRequest,
} from "./floor-plan.mapper";
import {
  assertFloorPlanGenerationRequest,
  extractGenerationHttpError,
  parseGenerationStreamEvent,
  readGenerationHttpErrorBody,
} from "./floor-plan.validators";
import type { GenerationRequest as ApiGenerationRequest } from "./floor-plan.api.types";
import type {
  FloorPlanEventStream,
  FloorPlanGenerationSession,
  FloorPlanStreamCloseReason,
  FloorPlanStreamHandlers,
  FloorPlanStreamOptions,
} from "./floor-plan.service.types";

const configuredStreamPath = import.meta.env.VITE_FLOOR_PLAN_STREAM_PATH?.trim();

/**
 * Relative path for the documented POST SSE endpoint.
 *
 * Keep the backend prefix in VITE_API_BASE_URL. Override this path only when
 * the deployment mounts the endpoint at a different relative location.
 */
export const FLOOR_PLAN_STREAM_PATH =
  configuredStreamPath && configuredStreamPath.length > 0
    ? configuredStreamPath
    : "/generation/stream";

const mergeHeaders = (
  defaults: Record<string, string>,
  customHeaders?: HeadersInit,
): Headers => {
  const headers = new Headers(defaults);

  if (customHeaders !== undefined) {
    new Headers(customHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
};

const isAbortError = (error: unknown): boolean => {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  );
};

const makeAbortedError = (
  message: string,
  jobId: string | null,
  cause?: unknown,
): FloorPlanServiceError => {
  return new FloorPlanServiceError({
    kind: "aborted",
    message,
    jobId: jobId ?? undefined,
    cause,
  });
};

const toFloorPlanServiceError = (
  error: unknown,
  jobId: string | null,
): FloorPlanServiceError => {
  if (error instanceof FloorPlanServiceError) {
    return error;
  }

  return new FloorPlanServiceError({
    kind: "transport",
    message: "The floor-plan stream failed unexpectedly.",
    jobId: jobId ?? undefined,
    cause: error,
  });
};

const createGenerationError = (
  event: GenerationErrorEvent,
): FloorPlanServiceError => {
  return new FloorPlanServiceError({
    kind: "generation_error",
    message: event.payload.message,
    jobId: event.jobId,
    code: event.payload.code,
    stage: event.payload.stage,
    eventName: event.event,
    details: event.payload,
  });
};

/**
 * Opens POST /generation/stream and consumes its text/event-stream body.
 *
 * Browser EventSource is intentionally not used because this endpoint requires
 * POST plus a JSON request body.
 */
export const startFloorPlanGeneration = async (
  request: FloorPlanGenerationRequest,
  handlers: FloorPlanStreamHandlers,
  options: FloorPlanStreamOptions = {},
): Promise<FloorPlanGenerationSession> => {
  const apiRequest: ApiGenerationRequest =
    toFloorPlanGenerationApiRequest(request);

  assertFloorPlanGenerationRequest(apiRequest);

  const fetchImplementation = options.fetchImplementation ?? fetch;
  const controller = new AbortController();
  let closeRequested = false;
  let closed = false;
  let resolvedJobId: string | null = null;

  const notifyClose = (() => {
    let notified = false;

    return (reason: FloorPlanStreamCloseReason): void => {
      if (notified) {
        return;
      }

      notified = true;
      handlers.onClose?.(reason);
    };
  })();

  const forwardExternalAbort = (): void => {
    controller.abort(options.signal?.reason);
  };

  if (options.signal?.aborted) {
    forwardExternalAbort();
  } else {
    options.signal?.addEventListener("abort", forwardExternalAbort, {
      once: true,
    });
  }

  const stream: FloorPlanEventStream = {
    get closed(): boolean {
      return closed;
    },

    close(): void {
      if (closed || closeRequested) {
        return;
      }

      closeRequested = true;
      controller.abort("Floor-plan stream closed by the client.");
    },
  };

  let response: Response;

  try {
    response = await fetchImplementation(createApiUrl(FLOOR_PLAN_STREAM_PATH), {
      method: "POST",
      headers: mergeHeaders(
        {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        options.headers,
      ),
      body: JSON.stringify(apiRequest),
      signal: controller.signal,
    });
  } catch (error: unknown) {
    options.signal?.removeEventListener("abort", forwardExternalAbort);
    closed = true;

    if (controller.signal.aborted || isAbortError(error)) {
      notifyClose("aborted");
      throw makeAbortedError(
        "The floor-plan stream request was aborted before opening.",
        null,
        error,
      );
    }

    throw new FloorPlanServiceError({
      kind: "transport",
      message: "Unable to communicate with the floor-plan streaming API.",
      cause: error,
    });
  }

  if (!response.ok) {
    options.signal?.removeEventListener("abort", forwardExternalAbort);
    closed = true;

    const body = await readGenerationHttpErrorBody(response);
    const errorDetails = extractGenerationHttpError(body);

    throw new FloorPlanServiceError({
      kind: "api_error",
      message:
        errorDetails.message ??
        `Floor-plan streaming request failed with HTTP status ${response.status}.`,
      status: response.status,
      code: errorDetails.code,
      stage: errorDetails.stage,
      details: body,
    });
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("text/event-stream")) {
    options.signal?.removeEventListener("abort", forwardExternalAbort);
    closed = true;

    const unexpectedBody = await response.text().catch(() => "");
    throw new FloorPlanServiceError({
      kind: "invalid_response",
      message: "The floor-plan API returned a non-SSE success response.",
      status: response.status,
      details: {
        contentType,
        body: unexpectedBody,
      },
    });
  }

  if (response.body === null) {
    options.signal?.removeEventListener("abort", forwardExternalAbort);
    closed = true;

    throw new FloorPlanServiceError({
      kind: "invalid_response",
      message: "The floor-plan SSE response has no readable body.",
      status: response.status,
    });
  }

  resolvedJobId = response.headers.get("X-Generation-Job-ID");
  handlers.onOpen?.(resolvedJobId);

  const responseBody = response.body;

  const completion = (async (): Promise<FloorPlanGenerationResult> => {
    const floorPlans = new Map<number, FloorPlanEvent>();
    let lastSequence = 0;
    let completedEvent: CompletedEvent | null = null;
    let generationError: FloorPlanServiceError | null = null;

    try {
      await consumeSseStream(responseBody, async (frame) => {
        if (completedEvent !== null || generationError !== null) {
          throw new FloorPlanServiceError({
            kind: "sse_protocol",
            message: "The server emitted an event after a terminal SSE event.",
            jobId: resolvedJobId ?? undefined,
            eventName: frame.event ?? undefined,
            rawData: frame.data,
          });
        }

        const apiEvent = parseGenerationStreamEvent(
          frame.data,
          frame.event,
          frame.id,
          resolvedJobId,
        );
        const event = fromGenerationApiEvent(apiEvent);

        if (resolvedJobId === null) {
          resolvedJobId = event.jobId;
        }

        // Gaps are allowed because progress/trial events can be coalesced or
        // dropped. Delivered sequence values must still increase strictly.
        if (event.sequence <= lastSequence) {
          throw new FloorPlanServiceError({
            kind: "sse_protocol",
            message: `SSE sequence ${event.sequence} did not increase after ${lastSequence}.`,
            jobId: event.jobId,
            eventName: event.event,
            rawData: frame.data,
          });
        }

        lastSequence = event.sequence;
        await handlers.onEvent(event);

        if (event.event === "floor_plan") {
          floorPlans.set(event.sequence, event);
          return;
        }

        if (event.event === "error") {
          generationError = createGenerationError(event);
          return;
        }

        if (event.event === "completed") {
          completedEvent = event;
        }
      });

      if (closeRequested || controller.signal.aborted) {
        throw makeAbortedError(
          "The floor-plan stream was aborted by the client.",
          resolvedJobId,
        );
      }

      // Assignments happen inside the async frame callback, so make the
      // post-consumption state explicit for TypeScript control-flow analysis.
      const terminalGenerationError =
        generationError as FloorPlanServiceError | null;
      const terminalCompletedEvent = completedEvent as CompletedEvent | null;

      if (terminalGenerationError !== null) {
        throw terminalGenerationError;
      }

      if (terminalCompletedEvent === null) {
        throw new FloorPlanServiceError({
          kind: "stream_interrupted",
          message:
            "The floor-plan SSE connection ended without a completed or error event.",
          jobId: resolvedJobId ?? undefined,
        });
      }

      const finalSequence =
        terminalCompletedEvent.payload.finalFloorPlanSequence;
      const selectedFloorPlanEvent =
        finalSequence === null ? undefined : floorPlans.get(finalSequence);

      if (selectedFloorPlanEvent === undefined) {
        throw new FloorPlanServiceError({
          kind: "stream_interrupted",
          message:
            "The completed event did not reference a floor-plan event received by this client.",
          jobId: terminalCompletedEvent.jobId,
          eventName: terminalCompletedEvent.event,
          details: {
            finalFloorPlanSequence: finalSequence,
            receivedFloorPlanSequences: [...floorPlans.keys()],
          },
        });
      }

      notifyClose("completed");

      return {
        jobId: terminalCompletedEvent.jobId,
        completedEvent: terminalCompletedEvent,
        selectedFloorPlanEvent,
        selectedFloorPlan: selectedFloorPlanEvent.payload,
      };
    } catch (error: unknown) {
      const serviceError = toFloorPlanServiceError(error, resolvedJobId);

      if (
        serviceError.kind === "aborted" ||
        closeRequested ||
        controller.signal.aborted ||
        isAbortError(error)
      ) {
        notifyClose("aborted");
        throw serviceError.kind === "aborted"
          ? serviceError
          : makeAbortedError(
              "The floor-plan stream was aborted by the client.",
              resolvedJobId,
              error,
            );
      }

      if (serviceError.kind === "generation_error") {
        notifyClose("generation_error");
      }

      handlers.onError?.(serviceError);
      throw serviceError;
    } finally {
      closed = true;
      options.signal?.removeEventListener("abort", forwardExternalAbort);
    }
  })();

  return {
    get jobId(): string | null {
      return resolvedJobId;
    },
    stream,
    completion,
  };
};
