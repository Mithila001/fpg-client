import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  BoundaryServiceError,
  calculateBuildableSpace,
  type BuildableSpaceRequest,
} from "../../service/boundary";
import {
  FLOOR_PLAN_STREAM_PATH,
  FloorPlanServiceError,
  startFloorPlanGeneration,
  type FloorPlanGenerationRequest,
  type FloorPlanGenerationSession,
  type GenerationSseEvent,
} from "../../service/floor-plan";

const MOCK_BUILDABLE_SPACE_REQUEST: BuildableSpaceRequest = {
  land_boundary: {
    points: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ],
  },
  roads: [
    {
      boundary_edge_index: 0,
      role: "main_entry",
      road_type: "main_road",
    },
  ],
};

const MOCK_FLOOR_PLAN_REQUEST: FloorPlanGenerationRequest = {
  floor_limits: {
    max_width: 120,
    max_length: 100,
  },
  aspect_ratio: "4:3",
  rooms: [
    {
      id: "bedroom_1",
      room_type: "bedroom",
      name: "Bedroom 1",
      requested_size: "regular",
      required: true,
    },
    {
      id: "bathroom_1",
      room_type: "bathroom",
      requested_size: "regular",
    },
    {
      id: "kitchen_1",
      room_type: "kitchen",
      requested_size: "regular",
    },
    {
      id: "veranda_1",
      room_type: "veranda",
      requested_size: "regular",
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

const stringifyJson = (value: unknown): string => JSON.stringify(value, null, 2);
const parseJson = (value: string): unknown => JSON.parse(value) as unknown;

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
  value: string;
  emptyText: string;
}) => (
  <div className="min-w-0">
    <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
    <pre className="min-h-48 max-h-[34rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-100 shadow-inner">
      {value || emptyText}
    </pre>
  </div>
);

const ApiTestPage = () => {
  const [boundaryInput, setBoundaryInput] = useState(
    stringifyJson(MOCK_BUILDABLE_SPACE_REQUEST),
  );
  const [boundaryOutput, setBoundaryOutput] = useState("");
  const [boundaryState, setBoundaryState] = useState<RequestState>("idle");

  const [floorPlanInput, setFloorPlanInput] = useState(
    stringifyJson(MOCK_FLOOR_PLAN_REQUEST),
  );
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [latestFloorPlan, setLatestFloorPlan] = useState("");
  const [selectedFloorPlan, setSelectedFloorPlan] = useState("");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [floorPlanError, setFloorPlanError] = useState("");
  const [streamEvents, setStreamEvents] = useState<StreamLogEntry[]>([]);

  const sessionRef = useRef<FloorPlanGenerationSession | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL?.trim() || "Not configured";

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
    setBoundaryOutput("");

    try {
      const request = parseJson(boundaryInput) as BuildableSpaceRequest;
      const response = await calculateBuildableSpace(request);
      setBoundaryOutput(stringifyJson(response));
      setBoundaryState("success");
    } catch (error: unknown) {
      setBoundaryOutput(stringifyJson(serializeError(error)));
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
    setLatestFloorPlan("");
    setSelectedFloorPlan("");
    setTerminalOutput("");
    setFloorPlanError("");
    setStreamEvents([]);

    try {
      const request = parseJson(floorPlanInput) as FloorPlanGenerationRequest;

      const session = await startFloorPlanGeneration(
        request,
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

            setJobId(event.job_id);
            setStreamEvents((current) => [
              ...current.slice(-(MAX_VISIBLE_EVENTS - 1)),
              {
                receivedAt: new Date().toISOString(),
                event,
              },
            ]);

            if (event.event === "floor_plan") {
              setLatestFloorPlan(stringifyJson(event));
            } else if (event.event === "completed") {
              setTerminalOutput(stringifyJson(event));
            } else if (event.event === "error") {
              setTerminalOutput(stringifyJson(event));
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

            setFloorPlanError(stringifyJson(serializeError(error)));
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
          setSelectedFloorPlan(stringifyJson(result.selectedFloorPlanEvent));
          setTerminalOutput(stringifyJson(result.completedEvent));
          setStreamState("completed");
        })
        .catch((error: unknown) => {
          if (runIdRef.current !== runId || controller.signal.aborted) {
            return;
          }

          setFloorPlanError(stringifyJson(serializeError(error)));
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

      setFloorPlanError(stringifyJson(serializeError(error)));
      setStreamState("error");
    }
  };

  const abortStream = (): void => {
    requestControllerRef.current?.abort("Aborted from the API test page.");
    sessionRef.current?.stream.close();
  };

  const resetStreamTest = (): void => {
    runIdRef.current += 1;
    stopActiveStream();
    setFloorPlanInput(stringifyJson(MOCK_FLOOR_PLAN_REQUEST));
    setStreamState("idle");
    setJobId(null);
    setLatestFloorPlan("");
    setSelectedFloorPlan("");
    setTerminalOutput("");
    setFloorPlanError("");
    setStreamEvents([]);
  };

  return (
    <div className="min-h-full bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900">
                Disposable developer page
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                API and POST-SSE Test Console
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                Tests buildable space and the direct floor-plan POST SSE stream
                without integrating either flow into the production UI.
              </p>
            </div>

            <dl className="grid min-w-0 gap-3 rounded-xl border border-amber-200 bg-white/70 p-4 text-sm sm:min-w-96">
              <div>
                <dt className="font-semibold text-slate-600">API base URL</dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-950">
                  {apiBaseUrl}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-600">Stream path</dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-950">
                  {FLOOR_PLAN_STREAM_PATH}
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Test 1
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                Buildable Space API
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Calls <code className="font-mono">POST /buildable-space</code>.
              </p>
            </div>
            <StatusBadge status={boundaryState} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <label
                className="mb-2 block text-sm font-semibold text-slate-800"
                htmlFor="boundary-request"
              >
                Mock request JSON
              </label>
              <textarea
                id="boundary-request"
                value={boundaryInput}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setBoundaryInput(event.target.value)
                }
                spellCheck={false}
                className="min-h-[30rem] w-full resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void runBoundaryTest()}
                  disabled={boundaryState === "running"}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {boundaryState === "running" ? "Sending..." : "Send request"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBoundaryInput(stringifyJson(MOCK_BUILDABLE_SPACE_REQUEST));
                    setBoundaryOutput("");
                    setBoundaryState("idle");
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Reset mock
                </button>
              </div>
            </div>

            <JsonPanel
              title="Validated response or typed error"
              value={boundaryOutput}
              emptyText="The API response will appear here."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                Test 2
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                Floor-plan POST SSE stream
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Calls <code className="font-mono">POST {FLOOR_PLAN_STREAM_PATH}</code>{" "}
                and parses SSE frames from the response body.
              </p>
            </div>
            <StatusBadge status={streamState} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <label
                className="mb-2 block text-sm font-semibold text-slate-800"
                htmlFor="floor-plan-request"
              >
                Mock generation request JSON
              </label>
              <textarea
                id="floor-plan-request"
                value={floorPlanInput}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setFloorPlanInput(event.target.value)
                }
                spellCheck={false}
                className="min-h-[34rem] w-full resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void startStreamTest()}
                  disabled={streamState === "opening" || streamState === "open"}
                  className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {streamState === "opening" ? "Opening..." : "Start stream"}
                </button>
                <button
                  type="button"
                  onClick={abortStream}
                  disabled={streamState !== "open" && streamState !== "opening"}
                  className="rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Abort stream
                </button>
                <button
                  type="button"
                  onClick={resetStreamTest}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Reset mock
                </button>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Job ID</p>
                <p className="mt-2 break-all font-mono text-xs text-slate-700">
                  {jobId ?? "Waiting for the response header or first event"}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <JsonPanel
                title="Latest received floor_plan event"
                value={latestFloorPlan}
                emptyText="The latest usable or presentable plan will appear here."
              />
              <JsonPanel
                title="Final selected floor_plan event"
                value={selectedFloorPlan}
                emptyText="On completed, this uses final_floor_plan_sequence exactly."
              />
              <JsonPanel
                title="Terminal completed/error event"
                value={terminalOutput}
                emptyText="The terminal stream event will appear here."
              />
              <JsonPanel
                title="HTTP, generation, protocol, or connection error"
                value={floorPlanError}
                emptyText="Typed service errors will appear here."
              />
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  Live SSE event log
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
                  Stream events will appear here.
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
                        <span className="text-slate-500">{entry.receivedAt}</span>
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
          Sequence gaps are valid. The client keeps floor-plan events by sequence
          and selects only the event named by completed.payload.final_floor_plan_sequence.
          Aborting stops local delivery but does not cancel server computation.
        </aside>
      </div>
    </div>
  );
};

export default ApiTestPage;
