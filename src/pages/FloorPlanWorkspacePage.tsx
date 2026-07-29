import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  getRoomSizeConstraints,
  startFloorPlanGeneration,
  type FloorPlanGenerationSession,
} from "../service/floor-plan";
import type {
  BuildableSpaceRequest,
  BuildableSpaceResult,
  CandidateHint,
  FloorPlan,
  Point,
  RoadType,
  RoomSizeConstraint,
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
      flowId: error.flowId,
    };
  }
  if (error instanceof FloorPlanServiceError) {
    return { message: error.message, code: error.code };
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
  const [constraints, setConstraints] = useState<RoomSizeConstraint[]>([]);
  const [constraintsError, setConstraintsError] = useState<string | null>(null);
  const [requirements, setRequirements] =
    useState<FloorPlanRequirements | null>(null);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [activity, setActivity] = useState<WorkflowActivity>(
    "loading-constraints",
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

  const landArea = useMemo(
    () => polygonArea(snapshot.value.landBoundary.points),
    [snapshot.value.landBoundary.points],
  );

  const loadConstraints = useCallback(async (signal?: AbortSignal) => {
    setActivity((current) =>
      current === "idle" || current === "loading-constraints"
        ? "loading-constraints"
        : current,
    );
    setConstraintsError(null);

    try {
      const result = await getRoomSizeConstraints({ signal });
      setConstraints(result.constraints);
    } catch (requestError: unknown) {
      if (signal?.aborted) return;
      setConstraints([]);
      setConstraintsError(errorInfo(requestError).message);
    } finally {
      if (!signal?.aborted) {
        setActivity((current) =>
          current === "loading-constraints" ? "idle" : current,
        );
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadConstraints(controller.signal);
    return () => controller.abort();
  }, [loadConstraints]);

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
    } catch (requestError: unknown) {
      setError(errorInfo(requestError));
      setActivity("generating");
    }
  };

  const resetGeneration = () => {
    clearGenerationOutput();
    setError(null);
  };

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
            buildableResult={buildableResult}
            aspectRatio={aspectRatio}
            requirements={requirements}
            constraintsReady={constraints.length > 0}
            constraintsError={constraintsError}
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
            onRetryConstraints={() => void loadConstraints()}
          />
        )}
      />

      {buildableResult && (
        <RoomRequirementsDialog
          open={requirementsOpen}
          constraints={constraints}
          maxWidth={buildableResult.usableLand.width}
          maxLength={buildableResult.usableLand.length}
          initialValue={requirements}
          onClose={() => setRequirementsOpen(false)}
          onSave={(nextRequirements) => {
            setRequirements(nextRequirements);
            setRequirementsOpen(false);
            clearGenerationOutput();
            setGenerationMessage("Room requirements saved.");
          }}
        />
      )}
    </div>
  );
};

export default FloorPlanWorkspacePage;
