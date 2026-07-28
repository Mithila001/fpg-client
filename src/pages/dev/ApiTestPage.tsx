import { useEffect, useRef, useState } from "react";
import {
  BoundaryServiceError,
  calculateBuildableSpace,
} from "../../service/boundary";
import {
  FloorPlanServiceError,
  startFloorPlanGeneration,
  type FloorPlanGenerationSession,
} from "../../service/floor-plan";
import type {
  BuildableSpaceRequest,
  BuildableSpaceResult,
  CompletedEvent,
  FloorPlanGenerationRequest,
  FloorPlanPayload,
  GenerationErrorEvent,
  GenerationSseEvent,
} from "../../types";

const MOCK_BUILDABLE_SPACE_REQUEST: BuildableSpaceRequest = {
  landBoundary: {
    points: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ],
  },
  roads: [
    {
      boundaryEdgeIndex: 0,
      role: "main_entry",
      roadType: "main_road",
    },
  ],
};

const MOCK_FLOOR_PLAN_REQUEST: FloorPlanGenerationRequest = {
  floorLimits: {
    maxWidth: 120,
    maxLength: 100,
  },
  aspectRatio: "4:3",
  rooms: [
    {
      id: "bedroom_1",
      roomType: "bedroom",
      name: "Bedroom 1",
      requestedSize: "regular",
      required: true,
    },
    {
      id: "bathroom_1",
      roomType: "bathroom",
      requestedSize: "regular",
    },
    {
      id: "kitchen_1",
      roomType: "kitchen",
      requestedSize: "regular",
    },
    {
      id: "veranda_1",
      roomType: "veranda",
      requestedSize: "regular",
    },
  ],
};

type RequestState = "idle" | "running" | "success" | "error";
type StreamState =
  | "idle"
  | "opening"
  | "open"
  | "completed"
  | "generation_error"
  | "aborted"
  | "error";

interface StreamLogEntry {
  receivedAt: string;
  event: GenerationSseEvent;
}

const MAX_VISIBLE_EVENTS = 500;

const stringifyJson = (value: unknown): string => {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? String(value);
};

const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof BoundaryServiceError) {
    return {
      name: error.name,
      kind: error.kind,
      message: error.message,
      status: error.status,
      flowId: error.flowId,
      code: error.code,
      stage: error.stage,
      details: error.details,
    };
  }

  if (error instanceof FloorPlanServiceError) {
    return {
      name: error.name,
      kind: error.kind,
      message: error.message,
      status: error.status,
      jobId: error.jobId,
      code: error.code,
      stage: error.stage,
      eventName: error.eventName,
      rawData: error.rawData,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: "An unknown error occurred.",
    value: error,
  };
};

const statusClass = (status: RequestState | StreamState): string => {
  switch (status) {
    case "success":
    case "open":
    case "completed":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case "error":
    case "generation_error":
      return "bg-rose-100 text-rose-800 ring-rose-200";
    case "running":
    case "opening":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "aborted":
      return "bg-slate-200 text-slate-700 ring-slate-300";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
};

const StatusBadge = ({ status }: { status: RequestState | StreamState }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${statusClass(status)}`}
  >
    {status.replaceAll("_", " ")}
  </span>
);

const JsonPanel = ({
  title,
  value,
  emptyText,
}: {
  title: string;
  value: unknown | null;
  emptyText: string;
}) => (
  <div className="min-w-0">
    <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
    <pre className="min-h-48 max-h-[34rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-100 shadow-inner">
      {value === null ? emptyText : stringifyJson(value)}
    </pre>
  </div>
);

const ApiTestPage = () => {
  const [boundaryState, setBoundaryState] = useState<RequestState>("idle");
  const [boundaryResult, setBoundaryResult] =
    useState<BuildableSpaceResult | null>(null);
  const [boundaryError, setBoundaryError] =
    useState<Record<string, unknown> | null>(null);

  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [latestFloorPlan, setLatestFloorPlan] =
    useState<FloorPlanPayload | null>(null);
  const [selectedFloorPlan, setSelectedFloorPlan] =
    useState<FloorPlanPayload | null>(null);
  const [terminalEvent, setTerminalEvent] = useState<
    CompletedEvent | GenerationErrorEvent | null
  >(null);
  const [floorPlanError, setFloorPlanError] =
    useState<Record<string, unknown> | null>(null);
  const [streamEvents, setStreamEvents] = useState<StreamLogEntry[]>([]);

  const sessionRef = useRef<FloorPlanGenerationSession | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const stopActiveStream = (): void => {
    requestControllerRef.current?.abort("Stopped from the API test page.");
    requestControllerRef.current = null;
    sessionRef.current?.stream.close();
    sessionRef.current = null;
  };

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort("API test page unmounted.");
      sessionRef.current?.stream.close();
    };
  }, []);

  const runBoundaryTest = async (): Promise<void> => {
    setBoundaryState("running");
    setBoundaryResult(null);
    setBoundaryError(null);

    try {
      const result = await calculateBuildableSpace(
        MOCK_BUILDABLE_SPACE_REQUEST,
      );
      setBoundaryResult(result);
      setBoundaryState("success");
    } catch (error: unknown) {
      setBoundaryError(serializeError(error));
      setBoundaryState("error");
    }
  };

  const startStreamTest = async (): Promise<void> => {
    stopActiveStream();

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    const controller = new AbortController();
    requestControllerRef.current = controller;

    setStreamState("opening");
    setJobId(null);
    setLatestFloorPlan(null);
    setSelectedFloorPlan(null);
    setTerminalEvent(null);
    setFloorPlanError(null);
    setStreamEvents([]);

    try {
      const session = await startFloorPlanGeneration(
        MOCK_FLOOR_PLAN_REQUEST,
        {
          onOpen: (openedJobId) => {
            if (runIdRef.current !== runId) {
              return;
            }

            setJobId(openedJobId);
            setStreamState("open");
          },

          onEvent: (event) => {
            if (runIdRef.current !== runId) {
              return;
            }

            setJobId(event.jobId);
            setStreamEvents((current) => [
              ...current.slice(-(MAX_VISIBLE_EVENTS - 1)),
              {
                receivedAt: new Date().toISOString(),
                event,
              },
            ]);

            if (event.event === "floor_plan") {
              setLatestFloorPlan(event.payload);
            } else if (event.event === "completed") {
              setTerminalEvent(event);
            } else if (event.event === "error") {
              setTerminalEvent(event);
              setStreamState("generation_error");
            }
          },

          onClose: (reason) => {
            if (runIdRef.current !== runId) {
              return;
            }

            requestControllerRef.current = null;
            sessionRef.current = null;

            if (reason === "aborted") {
              setStreamState("aborted");
            }
          },

          onError: (error) => {
            if (runIdRef.current !== runId || controller.signal.aborted) {
              return;
            }

            setFloorPlanError(serializeError(error));
            setStreamState(
              error instanceof FloorPlanServiceError &&
                error.kind === "generation_error"
                ? "generation_error"
                : "error",
            );
          },
        },
        {
          signal: controller.signal,
        },
      );

      if (runIdRef.current !== runId) {
        session.stream.close();
        return;
      }

      sessionRef.current = session;
      setJobId(session.jobId);

      void session.completion
        .then((result) => {
          if (runIdRef.current !== runId) {
            return;
          }

          setJobId(result.jobId);
          setSelectedFloorPlan(result.selectedFloorPlan);
          setTerminalEvent(result.completedEvent);
          setStreamState("completed");
        })
        .catch((error: unknown) => {
          if (runIdRef.current !== runId || controller.signal.aborted) {
            return;
          }

          setFloorPlanError(serializeError(error));
          setStreamState(
            error instanceof FloorPlanServiceError &&
              error.kind === "generation_error"
              ? "generation_error"
              : "error",
          );
        });
    } catch (error: unknown) {
      if (runIdRef.current !== runId) {
        return;
      }

      requestControllerRef.current = null;

      if (
        controller.signal.aborted ||
        (error instanceof FloorPlanServiceError && error.kind === "aborted")
      ) {
        setStreamState("aborted");
        return;
      }

      setFloorPlanError(serializeError(error));
      setStreamState("error");
    }
  };

  const abortStream = (): void => {
    requestControllerRef.current?.abort("Aborted from the API test page.");
    sessionRef.current?.stream.close();
  };

  const resetBoundaryTest = (): void => {
    setBoundaryState("idle");
    setBoundaryResult(null);
    setBoundaryError(null);
  };

  const resetStreamTest = (): void => {
    runIdRef.current += 1;
    stopActiveStream();
    setStreamState("idle");
    setJobId(null);
    setLatestFloorPlan(null);
    setSelectedFloorPlan(null);
    setTerminalEvent(null);
    setFloorPlanError(null);
    setStreamEvents([]);
  };

  return (
    <div className="min-h-full bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div className="max-w-4xl">
            <div className="mb-2 inline-flex rounded-full bg-emerald-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900">
              Application-level integration example
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Floor-plan Service Usage Console
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              This page uses project-level camelCase models from
              <code className="mx-1 font-mono">src/types</code> and calls only
              public service operations. Endpoint paths, API request shapes,
              response validation, SSE parsing, and API-to-project mapping stay
              private inside the service layer.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Flow 1
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                Buildable-space calculation
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Calls <code className="font-mono">calculateBuildableSpace()</code>
                with a typed application request and receives a typed application
                result.
              </p>
            </div>
            <StatusBadge status={boundaryState} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <JsonPanel
                title="Application request model"
                value={MOCK_BUILDABLE_SPACE_REQUEST}
                emptyText="No request configured."
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void runBoundaryTest()}
                  disabled={boundaryState === "running"}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {boundaryState === "running"
                    ? "Calculating..."
                    : "Calculate buildable space"}
                </button>
                <button
                  type="button"
                  onClick={resetBoundaryTest}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear result
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <JsonPanel
                title="Application result"
                value={boundaryResult}
                emptyText="The mapped BuildableSpaceResult will appear here."
              />
              <JsonPanel
                title="Typed service error"
                value={boundaryError}
                emptyText="Boundary errors will appear here."
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                Flow 2
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                Floor-plan generation session
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Calls <code className="font-mono">startFloorPlanGeneration()</code>
                and consumes mapped project-level events and completion data.
              </p>
            </div>
            <StatusBadge status={streamState} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <JsonPanel
                title="Application generation request"
                value={MOCK_FLOOR_PLAN_REQUEST}
                emptyText="No request configured."
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void startStreamTest()}
                  disabled={streamState === "opening" || streamState === "open"}
                  className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {streamState === "opening"
                    ? "Opening..."
                    : "Generate floor plan"}
                </button>
                <button
                  type="button"
                  onClick={abortStream}
                  disabled={streamState !== "open" && streamState !== "opening"}
                  className="rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Abort generation
                </button>
                <button
                  type="button"
                  onClick={resetStreamTest}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear session
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Job ID</p>
                <p className="mt-2 break-all font-mono text-xs text-slate-700">
                  {jobId ?? "Waiting for the service session"}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <JsonPanel
                title="Latest mapped floor-plan payload"
                value={latestFloorPlan}
                emptyText="The latest usable or presentable plan will appear here."
              />
              <JsonPanel
                title="Final selected floor-plan payload"
                value={selectedFloorPlan}
                emptyText="The service-selected final plan will appear here."
              />
              <JsonPanel
                title="Terminal mapped event"
                value={terminalEvent}
                emptyText="The completed or generation-error event will appear here."
              />
              <JsonPanel
                title="Typed service error"
                value={floorPlanError}
                emptyText="Transport, protocol, validation, or generation errors will appear here."
              />
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  Project-level event log
                </h3>
                <p className="text-sm text-slate-600">
                  Latest {MAX_VISIBLE_EVENTS} events maximum. Current count:{" "}
                  {streamEvents.length}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStreamEvents([])}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear log
              </button>
            </div>

            <div className="max-h-[42rem] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4">
              {streamEvents.length === 0 ? (
                <p className="font-mono text-xs text-slate-400">
                  Mapped service events will appear here.
                </p>
              ) : (
                <div className="space-y-4">
                  {streamEvents.map((entry) => (
                    <article
                      key={`${entry.event.sequence}-${entry.receivedAt}`}
                      className="rounded-lg border border-slate-700 bg-slate-900 p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-xs">
                        <span className="rounded bg-purple-500/20 px-2 py-1 text-purple-200">
                          {entry.event.event}
                        </span>
                        <span className="text-slate-400">
                          sequence {entry.event.sequence}
                        </span>
                        <span className="text-slate-500">
                          {entry.receivedAt}
                        </span>
                      </div>
                      <pre className="overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-100">
                        {stringifyJson(entry.event)}
                      </pre>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-950">
          This component does not know the server endpoint, snake_case API
          fields, raw SSE frames, or final-plan selection protocol. The service
          validates and maps those details, then exposes application models and
          a generation-session abstraction.
        </aside>
      </div>
    </div>
  );
};

export default ApiTestPage;