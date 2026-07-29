import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FeedbackNotice,
  FeedbackNoticeStack,
  type FeedbackNoticeData,
  type NoticeSeverity,
} from "../components/FeedbackNotice";
import {
  createWorkspaceSnapshot,
  FloorPlanWorkspace,
  snapWorkspaceRequestToGrid,
  type FloorPlanEditorSnapshot,
  type FloorPlanWorkspacePhase,
} from "../features/floor-plan-editor";
import {
  RoomRequirementsDialog,
  WorkflowSidebar,
  type FloorPlanRequirements,
  type WorkflowActivity,
  type WorkflowErrorInfo,
  type WorkflowTab,
} from "../features/floor-plan-workflow";
import { PROJECT_AREA_UNITS_PER_SQUARE_METER } from "../measurement";
import {
  BoundaryServiceError,
  calculateBuildableSpace,
} from "../service/boundary";
import {
  FloorPlanServiceError,
  cancelFloorPlanGeneration,
  startFloorPlanGeneration,
  type FloorPlanGenerationSession,
} from "../service/floor-plan";
import { MetadataServiceError, getMetadata } from "../service/metadata";
import type {
  BuildableSpaceRequest,
  BuildableSpaceResult,
  CandidateHint,
  FloorPlan,
  Point,
  RoadType,
  WorkspaceMetadata,
} from "../types";

const INITIAL_LAND: BuildableSpaceRequest = {
  landBoundary: {
    points: [
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 80, y: 60 },
      { x: 0, y: 60 },
    ],
  },
  roads: [],
};

const polygonArea = (points: Point[]): number => {
  let sum = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    sum += point.x * next.y - next.x * point.y;
  });
  return Math.abs(sum / 2);
};

const centroid = (points: Point[]): Point => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
});

const scalePolygonToArea = (points: Point[], targetArea: number): Point[] => {
  const currentArea = polygonArea(points);
  if (currentArea <= 0) return points;
  const center = centroid(points);
  const factor = Math.sqrt(targetArea / currentArea);
  return points.map((point) => ({
    x: center.x + (point.x - center.x) * factor,
    y: center.y + (point.y - center.y) * factor,
  }));
};

const statusMessage = (status: string): string => {
  const labels: Record<string, string> = {
    job_started: "Generation job started.",
    candidate_search_started: "Searching candidate room placements…",
    floor_plan_generation_started: "Building candidate floor plans…",
    usable_floor_plan_found: "A usable floor plan was found.",
    presentable_floor_plan_found: "A presentable floor plan was found.",
    timeout_reached: "Generation time limit reached; selecting the best result.",
  };
  return labels[status] ?? status.replaceAll("_", " ");
};

const errorInfo = (error: unknown): WorkflowErrorInfo => {
  if (error instanceof BoundaryServiceError) {
    return {
      message: error.message,
      code: error.code,
      stage: error.stage,
      flowId: error.flowId,
      details: error.details,
    };
  }
  if (error instanceof FloorPlanServiceError) {
    return {
      message: error.message,
      code: error.code,
      stage: error.stage,
      details: error.details,
    };
  }
  if (error instanceof MetadataServiceError) {
    return {
      message: error.message,
      code: error.code,
      stage: error.stage,
      details: error.details,
    };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: "An unexpected error occurred." };
};

const initialSnapshot = createWorkspaceSnapshot(INITIAL_LAND);

const FloorPlanWorkspacePage = () => {
  const [snapshot, setSnapshot] =
    useState<FloorPlanEditorSnapshot>(initialSnapshot);
  const [activeTab, setActiveTab] = useState<WorkflowTab>("land");
  const [roadType, setRoadType] = useState<RoadType>("main_road");
  const [targetAreaInput, setTargetAreaInput] = useState("48");
  const [buildableResult, setBuildableResult] =
    useState<BuildableSpaceResult | null>(null);
  const [metadata, setMetadata] = useState<WorkspaceMetadata | null>(null);
  const [metadataError, setMetadataError] =
    useState<WorkflowErrorInfo | null>(null);
  const [requirements, setRequirements] =
    useState<FloorPlanRequirements | null>(null);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [activity, setActivity] = useState<WorkflowActivity>(
    "loading-metadata",
  );
  const [error, setError] = useState<WorkflowErrorInfo | null>(null);
  const [generationMessage, setGenerationMessage] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [hints, setHints] = useState<CandidateHint[]>([]);
  const [candidatePlan, setCandidatePlan] = useState<FloorPlan | null>(null);
  const [finalPlan, setFinalPlan] = useState<FloorPlan | null>(null);
  const [finalScoring, setFinalScoring] = useState<{
    totalScore: number;
    passedCritical: boolean;
  } | null>(null);
  const [progress, setProgress] = useState<{
    current?: number;
    total?: number;
    label?: string;
  } | null>(null);
  const [noResult, setNoResult] = useState(false);
  const activeSessionRef = useRef<FloorPlanGenerationSession | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);
  const noticeIdRef = useRef(0);
  const [notices, setNotices] = useState<FeedbackNoticeData[]>([]);

  const addNotice = useCallback(
    (severity: NoticeSeverity, title: string, message: string) => {
      noticeIdRef.current += 1;
      setNotices((current) => [
        ...current,
        { id: noticeIdRef.current, severity, title, message },
      ]);
    },
    [],
  );

  const landArea = useMemo(
    () => polygonArea(snapshot.value.landBoundary.points),
    [snapshot.value.landBoundary.points],
  );

  const loadWorkspaceMetadata = useCallback(async (signal?: AbortSignal) => {
    setActivity("loading-metadata");
    setMetadataError(null);

    try {
      const result = await getMetadata({ signal });
      setMetadata(result);
      setRequirements(null);
      const defaultRoad =
        result.roadTypes.find((item) => item.value === "main_road") ??
        result.roadTypes[0];
      setRoadType(defaultRoad.value);
      const defaultRatio =
        result.compatibleAspectRatios.find((item) => item.label === "1:1") ??
        result.compatibleAspectRatios[0];
      setAspectRatio(defaultRatio.label);
      addNotice(
        "success",
        "Workspace ready",
        "Server metadata loaded successfully.",
      );
    } catch (requestError: unknown) {
      if (signal?.aborted) return;
      setMetadata(null);
      setMetadataError(errorInfo(requestError));
    } finally {
      if (!signal?.aborted) {
        setActivity("idle");
      }
    }
  }, [addNotice]);

  useEffect(() => {
    const controller = new AbortController();
    void loadWorkspaceMetadata(controller.signal);
    return () => controller.abort();
  }, [loadWorkspaceMetadata]);

  useEffect(() => {
    if (notices.length === 0) return;
    const timers = notices.map((notice) =>
      window.setTimeout(
        () =>
          setNotices((current) =>
            current.filter((item) => item.id !== notice.id),
          ),
        5000,
      ),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [notices]);

  useEffect(
    () => () => {
      generationAbortRef.current?.abort("Workspace unmounted.");
      activeSessionRef.current?.stream.close();
    },
    [],
  );

  const clearGenerationOutput = () => {
    setHints([]);
    setCandidatePlan(null);
    setFinalPlan(null);
    setFinalScoring(null);
    setProgress(null);
    setNoResult(false);
    setJobId(null);
    setGenerationMessage("");
  };

  const invalidateAfterLandChange = () => {
    setBuildableResult(null);
    setRequirements(null);
    clearGenerationOutput();
  };

  const handleEditorChange = (nextSnapshot: FloorPlanEditorSnapshot) => {
    const normalizedValue: BuildableSpaceRequest = {
      ...nextSnapshot.value,
      roads: nextSnapshot.value.roads.map((road) => ({ ...road, roadType })),
    };
    const normalizedSnapshot = createWorkspaceSnapshot(normalizedValue);
    const changed =
      JSON.stringify(normalizedSnapshot.value) !== JSON.stringify(snapshot.value);

    setSnapshot(normalizedSnapshot);
    if (changed && buildableResult !== null) invalidateAfterLandChange();
    setError(null);
  };

  const handleRoadTypeChange = (nextRoadType: RoadType) => {
    setRoadType(nextRoadType);
    if (snapshot.value.roads.length === 0) return;

    const nextSnapshot = createWorkspaceSnapshot({
      ...snapshot.value,
      roads: snapshot.value.roads.map((road) => ({
        ...road,
        roadType: nextRoadType,
      })),
    });
    setSnapshot(nextSnapshot);
    if (buildableResult !== null) invalidateAfterLandChange();
  };

  const applyTargetArea = () => {
    const targetSquareMeters = Number(targetAreaInput);
    if (!Number.isFinite(targetSquareMeters) || targetSquareMeters <= 0) {
      setError({ message: "Enter a valid positive land area." });
      return;
    }

    const targetArea =
      targetSquareMeters * PROJECT_AREA_UNITS_PER_SQUARE_METER;
    const scaledRequest = snapWorkspaceRequestToGrid({
      ...snapshot.value,
      landBoundary: {
        points: scalePolygonToArea(
          snapshot.value.landBoundary.points,
          targetArea,
        ),
      },
    });
    const nextSnapshot = createWorkspaceSnapshot(scaledRequest);
    if (!nextSnapshot.isValid) {
      setError({
        message:
          nextSnapshot.issues[0]?.message ??
          "The scaled land boundary is invalid.",
      });
      return;
    }

    setSnapshot(nextSnapshot);
    setTargetAreaInput(
      (
        polygonArea(nextSnapshot.value.landBoundary.points) /
        PROJECT_AREA_UNITS_PER_SQUARE_METER
      ).toFixed(2),
    );
    invalidateAfterLandChange();
    setError(null);
  };

  const findBuildableSpace = async () => {
    const exactSnapshot = createWorkspaceSnapshot(
      snapWorkspaceRequestToGrid(snapshot.value),
    );
    if (!exactSnapshot.isValid) {
      setSnapshot(exactSnapshot);
      setError({
        message:
          exactSnapshot.issues[0]?.message ?? "The land boundary is invalid.",
      });
      return;
    }
    if (exactSnapshot.value.roads.length !== 1) {
      setError({ message: "Select exactly one main-entry road." });
      return;
    }

    setSnapshot(exactSnapshot);
    setActivity("finding-buildable-space");
    setError(null);
    clearGenerationOutput();
    setRequirements(null);

    try {
      const result = await calculateBuildableSpace(exactSnapshot.value);
      setBuildableResult(result);
      setGenerationMessage(
        "Buildable space is ready. Configure the floor plan.",
      );
      addNotice(
        "success",
        "Buildable space ready",
        "The server returned a usable floor area.",
      );
      setActiveTab("generate");
    } catch (requestError: unknown) {
      setError(errorInfo(requestError));
    } finally {
      setActivity("idle");
    }
  };

  const editLand = () => {
    invalidateAfterLandChange();
    setActiveTab("land");
    setError(null);
  };

  const generateFloorPlan = async () => {
    if (!requirements || !buildableResult) return;

    clearGenerationOutput();
    setActiveTab("generate");
    setActivity("generating");
    setError(null);
    setGenerationMessage("Opening generation stream…");

    const generationController = new AbortController();
    generationAbortRef.current = generationController;

    try {
      const session = await startFloorPlanGeneration(
        {
          floorLimits: {
            maxWidth: requirements.floorWidth,
            maxLength: requirements.floorLength,
          },
          aspectRatio,
          rooms: requirements.rooms,
        },
        {
          onOpen: (openedJobId) => {
            setJobId(openedJobId);
            setGenerationMessage("Generation stream connected.");
          },
          onJobId: (openedJobId) => setJobId(openedJobId),
          onEvent: (event) => {
            switch (event.event) {
              case "status":
                setGenerationMessage(statusMessage(event.payload.status));
                break;
              case "candidate_trial":
                setHints(event.payload.candidateHints);
                setProgress({
                  current: event.payload.trialNumber,
                  total: event.payload.trialLimit,
                  label: "Candidate trials",
                });
                setGenerationMessage(
                  `Testing candidate ${event.payload.trialNumber} of ${event.payload.trialLimit}.`,
                );
                break;
              case "progress":
                setProgress({
                  current: event.payload.trialNumber,
                  total: event.payload.trialLimit,
                  label: event.payload.stage.replaceAll("_", " "),
                });
                break;
              case "floor_plan":
                setCandidatePlan(event.payload.floorPlan);
                setFinalScoring({
                  totalScore: event.payload.score,
                  passedCritical: event.payload.passedCritical,
                });
                setGenerationMessage(
                  `Received a ${event.payload.classification} candidate.`,
                );
                break;
              case "cancelled":
                setGenerationMessage("Generation was cancelled.");
                break;
              case "completed":
                setGenerationMessage("Generation completed.");
                break;
              case "error":
                setGenerationMessage(event.payload.message);
                break;
            }
          },
          onError: (streamError) => setError(errorInfo(streamError)),
        },
        { signal: generationController.signal },
      );

      activeSessionRef.current = session;
      setJobId(session.jobId);
      const result = await session.completion;
      activeSessionRef.current = null;
      generationAbortRef.current = null;

      if (result.status === "cancelled") {
        setActivity("idle");
        setJobId(null);
        setHints([]);
        setCandidatePlan(null);
        setProgress(null);
        setGenerationMessage(
          "Generation cancelled. You can start another run.",
        );
        return;
      }

      if (result.selectedFloorPlan === null) {
        setNoResult(true);
        setCandidatePlan(null);
        setGenerationMessage("The run completed without a usable floor plan.");
      } else {
        setFinalPlan(result.selectedFloorPlan.floorPlan);
        setFinalScoring({
          totalScore: result.selectedFloorPlan.score,
          passedCritical: result.selectedFloorPlan.passedCritical,
        });
        setNoResult(false);
        setGenerationMessage("Final floor plan ready.");
      }
      setJobId(null);
      setActivity("idle");
    } catch (requestError: unknown) {
      activeSessionRef.current = null;
      generationAbortRef.current = null;
      setJobId(null);
      setActivity("idle");
      setError(errorInfo(requestError));
    }
  };

  const cancelGeneration = async () => {
    if (!jobId) return;

    setActivity("cancelling");
    setError(null);
    try {
      const result = await cancelFloorPlanGeneration(jobId);
      setGenerationMessage(
        result.status === "already_requested"
          ? "Cancellation was already requested. Waiting for the terminal event…"
          : "Cancellation requested. Waiting for the stream to close…",
      );
      addNotice(
        "info",
        "Cancellation requested",
        "Waiting for the server to send the terminal stream event.",
      );
    } catch (requestError: unknown) {
      setError(errorInfo(requestError));
      setActivity("generating");
    }
  };

  const resetGeneration = () => {
    clearGenerationOutput();
    setError(null);
  };

  if (metadata === null) {
    const loading = activity === "loading-metadata";
    const failureNotice: FeedbackNoticeData | null = metadataError
      ? {
          id: -1,
          severity: "error",
          title: "Workspace metadata unavailable",
          message: metadataError.message,
        }
      : null;

    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          {loading ? (
            <div role="status" className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              <div>
                <h1 className="font-bold text-slate-950">
                  Preparing workspace
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Loading supported rooms, roads, ratios, and validation rules
                  from the server.
                </p>
              </div>
            </div>
          ) : failureNotice ? (
            <>
              <FeedbackNotice notice={failureNotice} />
              {(metadataError?.code || metadataError?.stage) && (
                <dl className="mt-3 grid gap-1 px-1 text-xs text-slate-500">
                  {metadataError.code && (
                    <div>
                      <dt className="inline font-semibold">Code: </dt>
                      <dd className="inline">{metadataError.code}</dd>
                    </div>
                  )}
                  {metadataError.stage && (
                    <div>
                      <dt className="inline font-semibold">Stage: </dt>
                      <dd className="inline">{metadataError.stage}</dd>
                    </div>
                  )}
                </dl>
              )}
              {metadataError?.details !== undefined && (
                <details className="mt-3 text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold">
                    Technical details
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-mono text-[11px]">
                    {JSON.stringify(metadataError.details, null, 2)}
                  </pre>
                </details>
              )}
              <button
                type="button"
                onClick={() => void loadWorkspaceMetadata()}
                className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
              >
                Retry metadata
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  const phase: FloorPlanWorkspacePhase =
    activity === "generating" || activity === "cancelling"
      ? "generating"
      : finalPlan
        ? "final-plan"
        : noResult
          ? "no-result"
          : buildableResult
            ? "buildable-review"
            : "editing-land";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100 lg:overflow-hidden">
      <FloorPlanWorkspace
        phase={phase}
        value={snapshot.value}
        onChange={handleEditorChange}
        readOnly={
          activity === "finding-buildable-space" ||
          activity === "generating" ||
          activity === "cancelling" ||
          buildableResult !== null ||
          finalPlan !== null ||
          noResult
        }
        buildableResult={buildableResult}
        generation={
          activity === "generating" || activity === "cancelling"
            ? {
                title:
                  activity === "cancelling"
                    ? "Stopping generation"
                    : "Generating floor plan",
                message: generationMessage || "Processing…",
                hints,
                candidatePlan,
                progress: progress ?? undefined,
              }
            : null
        }
        finalPlan={finalPlan}
        defaultShowDimensions
        className="min-h-0 flex-1 lg:h-full"
        canvasClassName="h-[55vh] min-h-[420px] border-b border-slate-200 lg:h-full lg:min-h-0 lg:border-b-0"
        renderSidePanel={({ landEditorControls, viewerControls }) => (
          <WorkflowSidebar
            activeTab={activeTab}
            snapshot={snapshot}
            landArea={landArea}
            targetAreaInput={targetAreaInput}
            roadType={roadType}
            metadata={metadata}
            buildableResult={buildableResult}
            aspectRatio={aspectRatio}
            requirements={requirements}
            activity={activity}
            generationMessage={generationMessage}
            jobId={jobId}
            error={error}
            finalScoring={finalScoring}
            progress={progress}
            hasFinalPlan={finalPlan !== null}
            noResult={noResult}
            landEditorControls={landEditorControls}
            viewerControls={viewerControls}
            onTabChange={setActiveTab}
            onTargetAreaInputChange={setTargetAreaInput}
            onApplyTargetArea={applyTargetArea}
            onRoadTypeChange={handleRoadTypeChange}
            onFindBuildableSpace={() => void findBuildableSpace()}
            onEditLand={editLand}
            onAspectRatioChange={setAspectRatio}
            onOpenRequirements={() => setRequirementsOpen(true)}
            onGenerate={() => void generateFloorPlan()}
            onCancelGeneration={() => void cancelGeneration()}
            onResetGeneration={resetGeneration}
          />
        )}
      />

      {buildableResult && (
        <RoomRequirementsDialog
          open={requirementsOpen}
          metadata={metadata}
          maxWidth={buildableResult.usableLand.width}
          maxLength={buildableResult.usableLand.length}
          initialValue={requirements}
          onClose={() => setRequirementsOpen(false)}
          onSave={(nextRequirements) => {
            setRequirements(nextRequirements);
            setRequirementsOpen(false);
            clearGenerationOutput();
            setGenerationMessage("Room requirements saved.");
            addNotice(
              "success",
              "Requirements saved",
              "Room selections passed client-side validation.",
            );
          }}
        />
      )}
      <FeedbackNoticeStack
        notices={notices}
        onDismiss={(id) =>
          setNotices((current) => current.filter((notice) => notice.id !== id))
        }
      />
    </div>
  );
};

export default FloorPlanWorkspacePage;
