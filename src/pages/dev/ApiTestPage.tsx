import { useEffect, useRef, useState } from "react";
import {
  formatProjectArea,
  formatProjectLength,
  PROJECT_AREA_UNITS_PER_SQUARE_METER,
  PROJECT_UNITS_PER_METER,
  parseDisplayArea,
  parseDisplayLength,
  projectAreaToSquareFeet,
  projectAreaToSquareMeters,
  projectLengthToFeet,
  projectLengthToMeters,
} from "../../measurement";
import {
  BoundaryServiceError,
  calculateBuildableSpace,
} from "../../service/boundary";
import {
  FloorPlanServiceError,
  startFloorPlanGeneration,
  type FloorPlanGenerationSession,
} from "../../service/floor-plan";
import {
  apiAreaToProjectArea,
  apiLengthToProjectLength,
  projectAreaToApiArea,
  projectLengthToApiLength,
} from "../../service/measurement";
import type {
  BuildableSpaceRequest,
  CancelledEvent,
  BuildableSpaceResult,
  CompletedEvent,
  DisplayAreaUnit,
  DisplayLengthUnit,
  FloorPlanGenerationRequest,
  FloorPlanPayload,
  GenerationErrorEvent,
  GenerationSseEvent,
  ProjectArea,
  ProjectLength,
} from "../../types";


const NUMERIC_TOLERANCE = 1e-9;

interface UnitEvaluationCase {
  name: string;
  category: "length" | "area" | "API boundary" | "format and input";
  actual: number | string | null;
  expected: number | string | null;
  passed: boolean;
}

const parseFiniteInput = (value: string): number | null => {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePositiveFiniteInput = (value: string): number | null => {
  const parsed = parseFiniteInput(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const valuesMatch = (
  actual: UnitEvaluationCase["actual"],
  expected: UnitEvaluationCase["expected"],
): boolean => {
  if (typeof actual === "number" && typeof expected === "number") {
    return (
      Math.abs(actual - expected) <=
      NUMERIC_TOLERANCE * Math.max(1, Math.abs(expected))
    );
  }

  return actual === expected;
};

const createUnitEvaluationCase = (
  name: string,
  category: UnitEvaluationCase["category"],
  actual: UnitEvaluationCase["actual"],
  expected: UnitEvaluationCase["expected"],
): UnitEvaluationCase => ({
  name,
  category,
  actual,
  expected,
  passed: valuesMatch(actual, expected),
});

const UNIT_EVALUATION_CASES: UnitEvaluationCase[] = [
  createUnitEvaluationCase(
    "10 project units equal 1 meter",
    "length",
    projectLengthToMeters(10),
    1,
  ),
  createUnitEvaluationCase(
    "1 meter becomes 10 project units",
    "format and input",
    parseDisplayLength("1", "meter"),
    10,
  ),
  createUnitEvaluationCase(
    "100 project units display as 32.80839895 feet",
    "length",
    projectLengthToFeet(100),
    32.80839895013123,
  ),
  createUnitEvaluationCase(
    "100 project area units equal 1 square meter",
    "area",
    projectAreaToSquareMeters(100),
    1,
  ),
  createUnitEvaluationCase(
    "1 square meter becomes 100 project area units",
    "format and input",
    parseDisplayArea("1", "square-meter"),
    100,
  ),
  createUnitEvaluationCase(
    "10,000 project area units display as 1,076.39104167 square feet",
    "area",
    projectAreaToSquareFeet(10_000),
    1076.2323,
  ),
  createUnitEvaluationCase(
    "Length formatting uses the selected display unit",
    "format and input",
    formatProjectLength(100, "meter"),
    "10 m",
  ),
  createUnitEvaluationCase(
    "Area formatting uses squared units",
    "format and input",
    formatProjectArea(10_000, "square-meter"),
    "100 m²",
  ),
  createUnitEvaluationCase(
    "Same-scale API length remains unchanged",
    "API boundary",
    apiLengthToProjectLength(250, 10),
    250,
  ),
  createUnitEvaluationCase(
    "Same-scale API area remains unchanged",
    "API boundary",
    apiAreaToProjectArea(40_000, 10),
    40_000,
  ),
  createUnitEvaluationCase(
    "Future API length scale 100 units/m maps into project scale 10 units/m",
    "API boundary",
    apiLengthToProjectLength(100, 100),
    10,
  ),
  createUnitEvaluationCase(
    "Future API area scale uses the squared ratio",
    "API boundary",
    apiAreaToProjectArea(10_000, 100),
    100,
  ),
  createUnitEvaluationCase(
    "Future API length conversion round-trips",
    "API boundary",
    projectLengthToApiLength(apiLengthToProjectLength(1234, 100), 100),
    1234,
  ),
  createUnitEvaluationCase(
    "Future API area conversion round-trips",
    "API boundary",
    projectAreaToApiArea(apiAreaToProjectArea(123_456, 100), 100),
    123_456,
  ),
];

const UNIT_EVALUATION_PASSED = UNIT_EVALUATION_CASES.every(
  (evaluation) => evaluation.passed,
);

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
type UnitEvaluationState = "pass" | "fail";
type StreamState =
  | "idle"
  | "opening"
  | "open"
  | "completed"
  | "cancelled"
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

const statusClass = (
  status: RequestState | StreamState | UnitEvaluationState,
): string => {
  switch (status) {
    case "success":
    case "pass":
    case "open":
    case "completed":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case "error":
    case "fail":
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

const StatusBadge = ({
  status,
}: {
  status: RequestState | StreamState | UnitEvaluationState;
}) => (
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
  const [displayLengthUnit, setDisplayLengthUnit] =
    useState<DisplayLengthUnit>("meter");
  const [displayAreaUnit, setDisplayAreaUnit] =
    useState<DisplayAreaUnit>("square-meter");
  const [projectLengthInput, setProjectLengthInput] = useState("100");
  const [projectAreaInput, setProjectAreaInput] = useState("10000");
  const [displayLengthInput, setDisplayLengthInput] = useState("10");
  const [displayAreaInput, setDisplayAreaInput] = useState("100");
  const [apiUnitsPerMeterInput, setApiUnitsPerMeterInput] = useState("10");
  const [apiLengthInput, setApiLengthInput] = useState("100");
  const [apiAreaInput, setApiAreaInput] = useState("10000");

  const projectLengthValue = parseFiniteInput(projectLengthInput);
  const projectAreaValue = parseFiniteInput(projectAreaInput);
  const parsedDisplayLength = parseDisplayLength(
    displayLengthInput,
    displayLengthUnit,
  );
  const parsedDisplayArea = parseDisplayArea(displayAreaInput, displayAreaUnit);
  const apiUnitsPerMeter = parsePositiveFiniteInput(apiUnitsPerMeterInput);
  const apiLengthValue = parseFiniteInput(apiLengthInput);
  const apiAreaValue = parseFiniteInput(apiAreaInput);

  const projectToDisplayPreview = {
    scale: {
      length: `${PROJECT_UNITS_PER_METER} project units = 1 meter`,
      area: `${PROJECT_AREA_UNITS_PER_SQUARE_METER} project area units = 1 square meter`,
    },
    length:
      projectLengthValue === null
        ? null
        : {
            projectUnits: projectLengthValue,
            meters: projectLengthToMeters(projectLengthValue as ProjectLength),
            feet: projectLengthToFeet(projectLengthValue as ProjectLength),
            formatted: formatProjectLength(
              projectLengthValue as ProjectLength,
              displayLengthUnit,
            ),
          },
    area:
      projectAreaValue === null
        ? null
        : {
            projectAreaUnits: projectAreaValue,
            squareMeters: projectAreaToSquareMeters(
              projectAreaValue as ProjectArea,
            ),
            squareFeet: projectAreaToSquareFeet(projectAreaValue as ProjectArea),
            formatted: formatProjectArea(
              projectAreaValue as ProjectArea,
              displayAreaUnit,
            ),
          },
  };

  const displayToProjectPreview = {
    length: {
      input: displayLengthInput,
      unit: displayLengthUnit,
      projectUnits: parsedDisplayLength,
    },
    area: {
      input: displayAreaInput,
      unit: displayAreaUnit,
      projectAreaUnits: parsedDisplayArea,
    },
  };

  const apiBoundaryPreview =
    apiUnitsPerMeter === null
      ? null
      : {
          apiUnitsPerMeter,
          applicationUnitsPerMeter: PROJECT_UNITS_PER_METER,
          length:
            apiLengthValue === null
              ? null
              : {
                  apiValue: apiLengthValue,
                  projectValue: apiLengthToProjectLength(
                    apiLengthValue,
                    apiUnitsPerMeter,
                  ),
                  apiRoundTrip: projectLengthToApiLength(
                    apiLengthToProjectLength(apiLengthValue, apiUnitsPerMeter),
                    apiUnitsPerMeter,
                  ),
                },
          area:
            apiAreaValue === null
              ? null
              : {
                  apiValue: apiAreaValue,
                  projectValue: apiAreaToProjectArea(
                    apiAreaValue,
                    apiUnitsPerMeter,
                  ),
                  apiRoundTrip: projectAreaToApiArea(
                    apiAreaToProjectArea(apiAreaValue, apiUnitsPerMeter),
                    apiUnitsPerMeter,
                  ),
                },
        };
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
    CompletedEvent | CancelledEvent | GenerationErrorEvent | null
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
            } else if (event.event === "cancelled") {
              setTerminalEvent(event);
              setStreamState("cancelled");
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
          if (result.status === "cancelled") {
            setSelectedFloorPlan(null);
            setTerminalEvent(result.cancelledEvent);
            setStreamState("cancelled");
            return;
          }

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

        <section className="rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
                Flow 0
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                Unit conversion evaluation
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
                Exercises project-to-display conversion, user-input parsing, and
                the API/application measurement boundary. The canonical project
                scale is 10 units per meter, so area uses 100 project area units
                per square meter.
              </p>
            </div>
            <StatusBadge status={UNIT_EVALUATION_PASSED ? "pass" : "fail"} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="font-bold text-slate-950">
                  Project units to visual units
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Change the project values and choose how they should be shown
                  to the user.
                </p>
              </div>

              <label className="block text-sm font-semibold text-slate-800">
                Project length
                <input
                  type="number"
                  value={projectLengthInput}
                  onChange={(event) => setProjectLengthInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-cyan-500 focus:ring-2"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Length display unit
                <select
                  value={displayLengthUnit}
                  onChange={(event) =>
                    setDisplayLengthUnit(event.target.value as DisplayLengthUnit)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring-2"
                >
                  <option value="meter">Meter</option>
                  <option value="foot">Foot</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Project area
                <input
                  type="number"
                  value={projectAreaInput}
                  onChange={(event) => setProjectAreaInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-cyan-500 focus:ring-2"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Area display unit
                <select
                  value={displayAreaUnit}
                  onChange={(event) =>
                    setDisplayAreaUnit(event.target.value as DisplayAreaUnit)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring-2"
                >
                  <option value="square-meter">Square meter</option>
                  <option value="square-foot">Square foot</option>
                </select>
              </label>

              <JsonPanel
                title="Conversion result"
                value={projectToDisplayPreview}
                emptyText="Enter valid project measurements."
              />
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="font-bold text-slate-950">
                  User input to project units
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  These fields use the selected display units and immediately
                  normalize the input into canonical project units.
                </p>
              </div>

              <label className="block text-sm font-semibold text-slate-800">
                User-entered length ({displayLengthUnit})
                <input
                  type="number"
                  value={displayLengthInput}
                  onChange={(event) => setDisplayLengthInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-cyan-500 focus:ring-2"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                User-entered area ({displayAreaUnit})
                <input
                  type="number"
                  value={displayAreaInput}
                  onChange={(event) => setDisplayAreaInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-cyan-500 focus:ring-2"
                />
              </label>

              <JsonPanel
                title="Normalized application values"
                value={displayToProjectPreview}
                emptyText="Enter valid display measurements."
              />
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="font-bold text-slate-950">
                  API boundary scale simulator
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Use 10 for today&apos;s pass-through contract or 100 to simulate
                  a future API scale. Area conversion must use the squared scale.
                </p>
              </div>

              <label className="block text-sm font-semibold text-slate-800">
                API units per meter
                <input
                  type="number"
                  min="0.000001"
                  step="any"
                  value={apiUnitsPerMeterInput}
                  onChange={(event) =>
                    setApiUnitsPerMeterInput(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-cyan-500 focus:ring-2"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                API length value
                <input
                  type="number"
                  value={apiLengthInput}
                  onChange={(event) => setApiLengthInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-cyan-500 focus:ring-2"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                API area value
                <input
                  type="number"
                  value={apiAreaInput}
                  onChange={(event) => setApiAreaInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-cyan-500 focus:ring-2"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setApiUnitsPerMeterInput("10");
                    setApiLengthInput("100");
                    setApiAreaInput("10000");
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Current API scale
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiUnitsPerMeterInput("100");
                    setApiLengthInput("100");
                    setApiAreaInput("10000");
                  }}
                  className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100"
                >
                  Future scale example
                </button>
              </div>

              <JsonPanel
                title="API/application round trip"
                value={apiBoundaryPreview}
                emptyText="API units per meter must be greater than zero."
              />
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  Deterministic conversion checks
                </h3>
                <p className="text-sm text-slate-600">
                  {UNIT_EVALUATION_CASES.filter((item) => item.passed).length} of{" "}
                  {UNIT_EVALUATION_CASES.length} checks passed.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Category</th>
                    <th className="px-4 py-3 font-bold">Check</th>
                    <th className="px-4 py-3 font-bold">Actual</th>
                    <th className="px-4 py-3 font-bold">Expected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {UNIT_EVALUATION_CASES.map((evaluation) => (
                    <tr key={evaluation.name}>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={evaluation.passed ? "pass" : "fail"}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {evaluation.category}
                      </td>
                      <td className="min-w-80 px-4 py-3 font-medium text-slate-900">
                        {evaluation.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {String(evaluation.actual)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {String(evaluation.expected)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

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