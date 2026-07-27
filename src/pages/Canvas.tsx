import React, { useEffect, useMemo, useRef, useState } from "react";
import WorkspaceCanvas from "../components/Konva/WorkspaceCanvas";
import type { RoomPoints, CornerKey, PointHint } from "../components/Konva/InputPlanCanvas";
import {
  calculatePolygonArea,
  calculatePolygonCentroid,
  scalePolygon,
  type RoadPlacement,
} from "../components/Konva/utils/geometry";
import {
  submitBuildableSpaceJob,
  fetchBuildableSpaceJobState,
  type BuildableSpaceRequest,
  type UsableLandPoint,
  type UsableLandRoadConnectedSegment,
  type BuildableRectangleSides,
} from "../api/getUsableLand";
import { fetchRoomSizeConstraints, type RoomSizeConstraint } from "../api/algorithms";
import {
  submitFormatV2Job,
  fetchFormatV2JobState,
  formatResultToSegments,
  roomCentersFromResult,
  roomsFromResult,
  roomsToLabels,
  roomsToOpenings,
} from "../api/floorPlan";
import type { Coordinate, Label } from "../components/Konva/shapes/types";
import type { CanvasOpening, JobEventPayload } from "../types";
import { formatAreaFromCm2, formatLengthFromCm, parseAreaM2InputToCm2 } from "../utils/units";
import ConfigureRoomsModal, {
  type SubmittedRoomRequirements,
} from "../components/ConfigureRoomsModal";
import { subscribeToJobEvents } from "../api/client";
import { cancelJob } from "../api/jobs";
import LoadingOverlay from "../components/LoadingOverlay";
import type { FormatV2Result, JobStateResponse } from "../types";
import type { ProcessedRoomData } from "../types";

const KEYS: CornerKey[] = ["A", "B", "C", "D", "E", "F"];
const MIN_BORDERS = 4;
const MAX_BORDERS = 6;

const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const buildClosedLoopCoordinates = (
  points: RoomPoints,
  orderedKeys: CornerKey[],
): Array<{ x: number; y: number }> => {
  const loop = orderedKeys.map((key) => ({ x: points[key].x, y: points[key].y }));
  if (loop.length > 0) {
    loop.push({ ...loop[0] });
  }
  return loop;
};

const Canvas: React.FC = () => {
  const [points, setPoints] = useState<RoomPoints>({
    A: { x: 140, y: 140 },
    B: { x: 460, y: 140 },
    C: { x: 460, y: 380 },
    D: { x: 140, y: 380 },
    E: { x: 300, y: 500 },
    F: { x: 520, y: 300 },
  });
  const [borderCount, setBorderCount] = useState(4);
  const [targetAreaInput, setTargetAreaInput] = useState<string>("");
  const [scaleError, setScaleError] = useState<string | null>(null);
  const [roadMode, setRoadMode] = useState<"idle" | "placing">("idle");
  const [selectedRoadType, setSelectedRoadType] = useState<string>("mainRoad");
  const [placedRoads, setPlacedRoads] = useState<RoadPlacement[]>([]);
  const [runAlgoStatus, setRunAlgoStatus] = useState<string | null>(null);
  const [isRunningAlgorithm, setIsRunningAlgorithm] = useState(false);
  const [buildableRectangleVertices, setBuildableRectangleVertices] = useState<
    UsableLandPoint[] | null
  >(null);
  const [shrunkBoundary, setShrunkBoundary] = useState<UsableLandPoint[] | null>(null);
  const [buildableRectangleSides, setBuildableRectangleSides] =
    useState<BuildableRectangleSides | null>(null);
  const [buildableRectangleSize, setBuildableRectangleSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const buildableEventSourceRef = useRef<EventSource | null>(null);
  const buildablePollRef = useRef<number | null>(null);

  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  const [submittedRequirements, setSubmittedRequirements] =
    useState<SubmittedRoomRequirements | null>(null);
  const [roomSizeConstraints, setRoomSizeConstraints] = useState<RoomSizeConstraint[]>([]);

  const [segments, setSegments] = useState<Coordinate[][] | null>(null);
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [openings, setOpenings] = useState<CanvasOpening[] | null>(null);
  const [roomCenters, setRoomCenters] = useState<Coordinate[] | null>(null);
  const [floorPlanRooms, setFloorPlanRooms] = useState<ProcessedRoomData[] | null>(null);
  const [isGeneratingFloorPlan, setIsGeneratingFloorPlan] = useState(false);
  const [floorPlanStatus, setFloorPlanStatus] = useState<string | null>(null);
  const [floorPlanError, setFloorPlanError] = useState<string | null>(null);
  const [showFloorPlanView, setShowFloorPlanView] = useState(false);
  const [floorPlanEvent, setFloorPlanEvent] = useState<JobEventPayload | null>(null);
  const [floorPlanJobId, setFloorPlanJobId] = useState<string | null>(null);
  const floorPlanEventSourceRef = useRef<EventSource | null>(null);
  const [pointHints, setPointHints] = useState<PointHint[] | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [showDimensions, setShowDimensions] = useState(false);

  const orderedKeys = useMemo(() => KEYS.slice(0, borderCount), [borderCount]);

  const currentArea = useMemo(() => {
    return calculatePolygonArea(points, orderedKeys);
  }, [points, orderedKeys]);

  const shapeSummary = useMemo(() => {
    return orderedKeys
      .map((key, idx) => {
        const next = orderedKeys[(idx + 1) % orderedKeys.length];
        const len = distance(points[key], points[next]);
        return `${key}->${next}: ${formatLengthFromCm(len, 2)}`;
      })
      .join(" | ");
  }, [orderedKeys, points]);

  // Auto-update target area input whenever current area changes
  useEffect(() => {
    setTargetAreaInput((currentArea / 10000).toFixed(2));
  }, [currentArea]);

  const clearAlgorithmResultState = () => {
    setBuildableRectangleVertices(null);
    setShrunkBoundary(null);
    setBuildableRectangleSides(null);
    setBuildableRectangleSize(null);
    setRunAlgoStatus(null);
  };

  const clearFloorPlanVisuals = (message?: string) => {
    setSegments(null);
    setLabels(null);
    setOpenings(null);
    setRoomCenters(null);
    setFloorPlanRooms(null);
    setShowDimensions(false);
    setFloorPlanError(null);
    setShowFloorPlanView(false);
    if (message) {
      setFloorPlanStatus(message);
    }
  };

  const invalidateFloorPlanFromStepA = () => {
    if (segments || labels || openings || roomCenters || showFloorPlanView) {
      clearFloorPlanVisuals("Step A changed. Generated floor plan was cleared.");
    }
  };

  const closeBuildableStream = () => {
    if (buildableEventSourceRef.current) {
      buildableEventSourceRef.current.close();
      buildableEventSourceRef.current = null;
    }
  };

  const stopBuildablePolling = () => {
    if (buildablePollRef.current !== null) {
      window.clearInterval(buildablePollRef.current);
      buildablePollRef.current = null;
    }
  };

  const closeFloorPlanStream = () => {
    if (floorPlanEventSourceRef.current) {
      floorPlanEventSourceRef.current.close();
      floorPlanEventSourceRef.current = null;
    }
  };

  const buildTrialEventNames = (count: number): string[] => {
    // Use provided count, but ensure a minimum range of 1000 trials
    // to catch all server-generated trials even if optuna_trial_count is low
    const maxTrials = Math.max(Math.floor(count) + 1, 1000);
    return Array.from({ length: maxTrials }, (_, index) => `trial_${index}`);
  };

  const eventDisplay = (event: JobEventPayload & { eventName?: string }): string => {
    // Map certain raw event names to more user-friendly UI text
    const evName = event.event ?? event.eventName;
    if (evName === "solver_gate_not_passed") return "Running Trials";
    if (event.message) return event.message;
    if (evName) return evName;
    return "Processing...";
  };

  const isTerminalEvent = (eventName?: string): boolean => {
    return (
      eventName === "success" ||
      eventName === "time_out" ||
      eventName === "timed_out" ||
      eventName === "fpg_low_score"
    );
  };

  useEffect(() => {
    let cancelled = false;
    fetchRoomSizeConstraints()
      .then((data) => {
        if (!cancelled) setRoomSizeConstraints(data);
      })
      .catch((err) => {
        console.error("fetchRoomSizeConstraints error:", err);
      });
    return () => {
      cancelled = true;
      closeBuildableStream();
      stopBuildablePolling();
      closeFloorPlanStream();
    };
  }, []);

  const addBorderLine = () => {
    if (isRunningAlgorithm || isGeneratingFloorPlan || borderCount >= MAX_BORDERS) return;
    setBorderCount((prev) => Math.min(MAX_BORDERS, prev + 1));
    clearAlgorithmResultState();
    invalidateFloorPlanFromStepA();
  };

  const removeBorderLine = () => {
    if (isRunningAlgorithm || isGeneratingFloorPlan || borderCount <= MIN_BORDERS) return;
    setBorderCount((prev) => Math.max(MIN_BORDERS, prev - 1));
    clearAlgorithmResultState();
    invalidateFloorPlanFromStepA();
  };

  const handlePointsChange = (nextPoints: RoomPoints) => {
    setPoints(nextPoints);
    clearAlgorithmResultState();
    invalidateFloorPlanFromStepA();
  };

  const handleApplyArea = () => {
    if (isRunningAlgorithm || isGeneratingFloorPlan) return;

    const targetAreaCm2 = parseAreaM2InputToCm2(targetAreaInput);
    if (targetAreaCm2 === null || targetAreaCm2 <= 0) {
      setScaleError("Please enter a valid positive number for area (m2).");
      return;
    }

    const baseArea = calculatePolygonArea(points, orderedKeys);
    if (baseArea <= 0) {
      setScaleError("Base polygon has zero area.");
      return;
    }

    const scale = Math.sqrt(targetAreaCm2 / baseArea);
    const centroid = calculatePolygonCentroid(points, orderedKeys);
    const scaledPoints = scalePolygon(points, orderedKeys, centroid, scale);

    setPoints(scaledPoints);
    setScaleError(null);
    clearAlgorithmResultState();
    invalidateFloorPlanFromStepA();
  };

  const handleRoadButtonClick = () => {
    if (isRunningAlgorithm || isGeneratingFloorPlan) return;
    setRoadMode((prev) => (prev === "placing" ? "idle" : "placing"));
  };

  const handleRoadPlace = (placement: RoadPlacement) => {
    setPlacedRoads([{ ...placement, roadType: selectedRoadType }]);
    setRoadMode("idle");
    clearAlgorithmResultState();
    invalidateFloorPlanFromStepA();
  };

  const handleRoadCancel = () => {
    setRoadMode("idle");
  };

  const finalizeBuildableJob = async (jobId: string) => {
    try {
      const state = await fetchBuildableSpaceJobState(jobId);
      const result = state.result;

      if (!result) {
        setRunAlgoStatus(
          `Step A finished with status ${state.status}, but no result was returned.`,
        );
        return;
      }

      const nextRectangle = result.buildable_rectangle?.vertices ?? [];
      const nextBoundary = result.shrunk_boundary ?? [];
      const nextRectangleWidth = result.buildable_rectangle?.width ?? null;
      const nextRectangleHeight = result.buildable_rectangle?.height ?? null;
      const nextSides = result.buildable_rectangle?.sides ?? null;

      setBuildableRectangleVertices(nextRectangle.length > 0 ? nextRectangle : null);
      setShrunkBoundary(nextBoundary.length > 0 ? nextBoundary : null);
      setBuildableRectangleSides(nextSides);
      setBuildableRectangleSize(
        nextRectangleWidth !== null && nextRectangleHeight !== null
          ? { width: nextRectangleWidth, height: nextRectangleHeight }
          : null,
      );

      if (nextRectangle.length > 0 || nextBoundary.length > 0) {
        setRunAlgoStatus(result.message || "Buildable space computed successfully.");
      } else {
        setRunAlgoStatus("Algorithm completed, but drawable geometry was not returned.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to finalize algorithm.";
      setBuildableRectangleVertices(null);
      setShrunkBoundary(null);
      setBuildableRectangleSides(null);
      setBuildableRectangleSize(null);
      setRunAlgoStatus(`Failed to run algorithm: ${message}`);
    } finally {
      stopBuildablePolling();
      setIsRunningAlgorithm(false);
    }
  };

  const startBuildablePolling = (jobId: string) => {
    stopBuildablePolling();
    buildablePollRef.current = window.setInterval(async () => {
      try {
        const state = await fetchBuildableSpaceJobState(jobId);
        if (state.status === "SEARCHING") return;
        stopBuildablePolling();
        void finalizeBuildableJob(jobId);
      } catch (error) {
        stopBuildablePolling();
        const message = error instanceof Error ? error.message : "Unable to fetch job status.";
        setRunAlgoStatus(`Failed to fetch job status: ${message}`);
        setIsRunningAlgorithm(false);
      }
    }, 1500);
  };

  const handleRunAlgorithm = async () => {
    if (placedRoads.length === 0 || isRunningAlgorithm || isGeneratingFloorPlan) return;

    closeBuildableStream();
    setIsRunningAlgorithm(true);
    setRunAlgoStatus("Submitting Step A job...");

    const area = calculatePolygonArea(points, orderedKeys);

    const roadConnected: UsableLandRoadConnectedSegment[] = placedRoads
      .map((road) => {
        const startKey = orderedKeys[road.segmentIndex];
        const endKey = orderedKeys[(road.segmentIndex + 1) % orderedKeys.length];
        if (!startKey || !endKey) return null;

        return {
          segment: [
            { x: points[startKey].x, y: points[startKey].y },
            { x: points[endKey].x, y: points[endKey].y },
          ],
          roadType: road.roadType || "mainRoad",
        };
      })
      .filter((item): item is UsableLandRoadConnectedSegment => item !== null);

    const payload: BuildableSpaceRequest = {
      area,
      segmentsCoordinates: buildClosedLoopCoordinates(points, orderedKeys),
      roadConnected,
      min_width: 80,
      min_height: 80,
    };

    try {
      const submission = await submitBuildableSpaceJob(payload);
      setRunAlgoStatus(submission.message || `Step A job submitted (${submission.job_id}).`);
      startBuildablePolling(submission.job_id);

      buildableEventSourceRef.current = subscribeToJobEvents(
        submission.job_id,
        (event) => {
          setRunAlgoStatus(eventDisplay(event));

          if (isTerminalEvent(event.event)) {
            closeBuildableStream();
            stopBuildablePolling();
            void finalizeBuildableJob(submission.job_id);
          }
        },
        () => {
          closeBuildableStream();
          setRunAlgoStatus("Step A updates disconnected. Polling job status...");
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to Find Buildable Space.";
      setBuildableRectangleVertices(null);
      setShrunkBoundary(null);
      setBuildableRectangleSize(null);
      setRunAlgoStatus(`Failed to run algorithm: ${message}`);
    } finally {
      if (!buildableEventSourceRef.current && buildablePollRef.current === null) {
        setIsRunningAlgorithm(false);
      }
    }
  };

  const handleOpenConfigureRooms = () => {
    if (!buildableRectangleSize) return;
    setIsRoomsModalOpen(true);
  };

  const handleRoomSubmit = (requirements: SubmittedRoomRequirements) => {
    setSubmittedRequirements(requirements);
    setFloorPlanStatus("Room requirements saved. Click Generate Floor Plan.");
    setIsRoomsModalOpen(false);
  };

  const isTimedOutFloorPlanResult = (state: JobStateResponse<FormatV2Result>): boolean => {
    const status = String(state.status ?? "").toUpperCase();
    const resultStatus = String(state.result?.status ?? "").toUpperCase();
    const resultMessage = String(state.result?.message ?? "").toLowerCase();

    return (
      status === "TIMED_OUT" ||
      resultStatus === "NO_FLOOR_PLAN" ||
      resultMessage.includes("no floor plan found")
    );
  };

  const finalizeFloorPlanJob = async (jobId: string) => {
    try {
      const state = await fetchFormatV2JobState(jobId);
      const result = state.result;

      if (isTimedOutFloorPlanResult(state)) {
        const timeoutMessage = "Server timed out, try again.";
        setFloorPlanError(timeoutMessage);
        setFloorPlanStatus(timeoutMessage);
        return;
      }

      if (!result) {
        setFloorPlanError(`Job finished with status ${state.status}, but no result was returned.`);
        setFloorPlanStatus(`Job ended with status ${state.status}.`);
        return;
      }

      if (
        !result.union_results?.unified_floor_plan ||
        !result.union_results?.floor_plan_with_openings
      ) {
        setFloorPlanError("Server timed out, try again.");
        setFloorPlanStatus("Server timed out, try again.");
        return;
      }

      setSegments(formatResultToSegments(result));
      setLabels(roomsToLabels(result));
      setOpenings(roomsToOpenings(result));
      setRoomCenters(roomCentersFromResult(result));
      setFloorPlanRooms(roomsFromResult(result));
      setFloorPlanStatus(result.message || "Floor plan generated successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to finalize floor plan.";
      setFloorPlanError(message);
      setFloorPlanStatus(`Failed to generate floor plan: ${message}`);
    } finally {
      setIsGeneratingFloorPlan(false);
    }
  };

  const handleCancelFloorPlanJob = async () => {
    if (!floorPlanJobId) return;
    try {
      await cancelJob(floorPlanJobId);
      closeFloorPlanStream();
      setIsGeneratingFloorPlan(false);
      setFloorPlanStatus("Job cancelled by user.");
    } catch (error) {
      console.error("Failed to cancel job:", error);
    }
  };

  const handleGenerateFloorPlan = async () => {
    if (!submittedRequirements || isGeneratingFloorPlan || isRunningAlgorithm) return;

    closeFloorPlanStream();
    setShowFloorPlanView(true);
    setIsGeneratingFloorPlan(true);
    setFloorPlanError(null);
    setFloorPlanStatus("Submitting floor plan job...");
    setFloorPlanEvent(null);
    setFloorPlanJobId(null);
    setPointHints(null);

    setSegments(null);
    setLabels(null);
    setOpenings(null);
    setRoomCenters(null);
    setFloorPlanRooms(null);
    setShowDimensions(false);

    try {
      const submission = await submitFormatV2Job({
        ...submittedRequirements.payload,
        aspect_ratio: aspectRatio,
      });
      setFloorPlanJobId(submission.job_id);
      setFloorPlanStatus(submission.message || `Floor plan job submitted (${submission.job_id}).`);

      const trialEvents = buildTrialEventNames(
        submittedRequirements.payload.optuna_trial_count ?? 0,
      );

      floorPlanEventSourceRef.current = subscribeToJobEvents(
        submission.job_id,
        (event) => {
          setFloorPlanEvent(event);
          setFloorPlanStatus(eventDisplay(event));

          if (event.data && typeof event.data === "object" && "point_hints" in event.data) {
            setPointHints(event.data.point_hints as PointHint[]);
          }

          if (isTerminalEvent(event.event)) {
            closeFloorPlanStream();
            void finalizeFloorPlanJob(submission.job_id);
          }
        },
        () => {
          closeFloorPlanStream();
          setFloorPlanError("Live updates disconnected. Check job status.");
          setIsGeneratingFloorPlan(false);
        },
        trialEvents,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate floor plan.";
      setFloorPlanError(message);
      setFloorPlanStatus(`Failed to generate floor plan: ${message}`);
    } finally {
      if (!floorPlanEventSourceRef.current) {
        setIsGeneratingFloorPlan(false);
      }
    }
  };

  const canvasMode = showFloorPlanView ? "view" : "edit";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex w-[72%] min-w-0 flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-800">
              {canvasMode === "edit"
                ? "Step A: Land Boundary Workspace"
                : "Step B: Floor Plan Preview"}
            </h1>
            <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
              Interactive Map
            </div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
            {canvasMode === "view" && segments && segments.length > 0 && (
              <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
                <button
                  type="button"
                  onClick={() => setShowDimensions((prev) => !prev)}
                  className={`pointer-events-auto flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-md transition-all hover:scale-105 active:scale-95 ${
                    showDimensions
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white/90 text-slate-700 backdrop-blur hover:bg-slate-50 hover:text-indigo-600"
                  }`}
                >
                  {showDimensions ? "Hide Dimensions" : "View Dimensions"}
                </button>
              </div>
            )}
            <WorkspaceCanvas
              mode={canvasMode}
              editState={{
                points,
                borderCount,
                editable: canvasMode === "edit" && !isRunningAlgorithm && !isGeneratingFloorPlan,
                roadMode,
                placedRoad: placedRoads[0] ?? null,
                buildableRectangle: buildableRectangleVertices,
                buildableRectangleSides,
                shrunkBoundary,
              }}
              editActions={{
                onAddBorderLine: addBorderLine,
                onRemoveBorderLine: removeBorderLine,
                onPointsChange: handlePointsChange,
                onRoadPlace: handleRoadPlace,
                onRoadCancel: handleRoadCancel,
              }}
              viewState={{
                segments,
                labels,
                openings,
                rooms: floorPlanRooms,
                isLoading: isGeneratingFloorPlan,
                status: floorPlanStatus,
                pointHints: pointHints,
              }}
              viewEffects={{
                roomDimensions: {
                  enabled: showDimensions,
                  rooms: floorPlanRooms,
                },
              }}
            />
            <LoadingOverlay
              isOpen={isGeneratingFloorPlan}
              title="Generating Floor Plan"
              event={floorPlanEvent}
              onCancel={handleCancelFloorPlanJob}
            />
          </div>
        </div>

        <div className="w-[28%] min-w-[340px] overflow-auto border-l border-slate-200 bg-white shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
          <div className="flex flex-col gap-6 p-6">
            <section className="flex flex-col rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-700">
                    1
                  </span>
                  Land Setup
                </h2>
                <div className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-500 shadow-sm border border-slate-200">
                  {borderCount} BORDERS
                </div>
              </div>
              <div className="wrap-break-word text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-100 shadow-inner">
                {shapeSummary}
              </div>

              <div className="mt-5 flex flex-col gap-4">
                <div className="flex items-center justify-between text-sm text-slate-700 border-t border-slate-200/60 pt-4">
                  <span className="font-medium">Current Area</span>
                  <span className="rounded bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 border border-indigo-100">
                    {formatAreaFromCm2(currentArea, 2)}
                  </span>
                </div>

                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 mt-1">
                  Target Area (m²)
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={targetAreaInput}
                    onChange={(event) => setTargetAreaInput(event.target.value)}
                    disabled={isRunningAlgorithm || isGeneratingFloorPlan}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="e.g. 50"
                  />
                </label>

                {scaleError && <div className="text-xs text-red-600">{scaleError}</div>}

                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex gap-2">
                    <button
                      onClick={handleApplyArea}
                      disabled={isRunningAlgorithm || isGeneratingFloorPlan}
                      className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                    >
                      Apply Area
                    </button>

                    <button
                      onClick={handleRoadButtonClick}
                      disabled={isRunningAlgorithm || isGeneratingFloorPlan}
                      className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-900 hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-500/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                    >
                      {roadMode === "placing" ? "Cancel Road" : "Add Road"}
                    </button>
                  </div>

                  {roadMode === "placing" && (
                    <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                      <div className="flex flex-col gap-2">
                        <label className="flex flex-col gap-1 font-medium">
                          Road Type
                          <select
                            value={selectedRoadType}
                            onChange={(e) => setSelectedRoadType(e.target.value)}
                            className="rounded border border-amber-300 bg-white px-2 py-1.5 text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="mainRoad">Main Road</option>
                            <option value="privateRoad">Private Road </option>
                          </select>
                        </label>
                        <span>
                          Hover near a boundary segment, left click to place, right click to cancel.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {placedRoads.length > 0 && (
                  <button
                    onClick={handleRunAlgorithm}
                    disabled={isRunningAlgorithm || isGeneratingFloorPlan}
                    className="mt-2 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-indigo-700 hover:to-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isRunningAlgorithm ? "Running Analysis..." : "Find Buildable Space"}
                  </button>
                )}

                {runAlgoStatus && (
                  <div className="rounded-lg bg-slate-100 p-3 text-xs font-medium text-slate-700 border border-slate-200 animate-pulse">
                    {runAlgoStatus}
                  </div>
                )}

                {buildableRectangleSize && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800 shadow-sm">
                    <div className="font-semibold mb-1">Usable Rectangle Configured</div>
                    <div className="text-emerald-700 text-xs">
                      {formatLengthFromCm(buildableRectangleSize.width, 2)} ×{" "}
                      {formatLengthFromCm(buildableRectangleSize.height, 2)}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="flex flex-col rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-sm transition-all hover:shadow-md">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
                    2
                  </span>
                  Generation
                </h2>
              </div>

              <label className="mb-4 flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Target Aspect Ratio
                <select
                  value={aspectRatio}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAspectRatio(val);
                    if (submittedRequirements) {
                      setSubmittedRequirements({
                        ...submittedRequirements,
                        payload: { ...submittedRequirements.payload, aspect_ratio: val },
                      });
                    }
                  }}
                  disabled={!buildableRectangleSize || isRunningAlgorithm || isGeneratingFloorPlan}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="1:1">1:1 Square</option>
                  <option value="4:3">4:3 Standard</option>
                  <option value="3:4">3:4 Portrait</option>
                  <option value="1:1.6">1:1.6 Golden (Wide)</option>
                  <option value="1.6:1">1.6:1 Golden (Tall)</option>
                </select>
              </label>

              <button
                onClick={handleOpenConfigureRooms}
                disabled={!buildableRectangleSize || isRunningAlgorithm || isGeneratingFloorPlan}
                className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow focus:outline-none focus:ring-2 focus:ring-teal-500/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                Configure Rooms
              </button>

              {!buildableRectangleSize && (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                  <span className="font-semibold">Action Required:</span> Complete Step 1 and run
                  algorithm before configuring rooms.
                </div>
              )}

              <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Requirements Status
                </div>
                <div className="text-sm font-medium text-slate-800">
                  {submittedRequirements?.roomSummary ?? (
                    <span className="text-slate-400 font-normal italic">Not configured yet</span>
                  )}
                </div>
                {submittedRequirements && (
                  <div className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                    Floor: {submittedRequirements.floorWidthCm / 100}m ×{" "}
                    {submittedRequirements.floorHeightCm / 100}m
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerateFloorPlan}
                disabled={!submittedRequirements || isRunningAlgorithm || isGeneratingFloorPlan}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative">
                  {isGeneratingFloorPlan ? "Generating Plan..." : "Generate Floor Plan"}
                </span>
              </button>

              {showFloorPlanView && (
                <button
                  onClick={() => setShowFloorPlanView(false)}
                  disabled={isGeneratingFloorPlan}
                  className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  Back to Land Setup
                </button>
              )}

              {floorPlanStatus && (
                <div className="mt-2 text-xs text-indigo-700">{floorPlanStatus}</div>
              )}
              {floorPlanError && <div className="mt-1 text-xs text-red-600">{floorPlanError}</div>}
              {segments && (
                <div className="mt-1 text-xs text-slate-600">
                  Generated rooms: {roomCenters?.length ?? 0}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <ConfigureRoomsModal
        isOpen={isRoomsModalOpen}
        maxUsableWidth={buildableRectangleSize?.width ?? null}
        maxUsableHeight={buildableRectangleSize?.height ?? null}
        initialRequirements={submittedRequirements}
        aspectRatio={aspectRatio}
        roomSizeConstraints={roomSizeConstraints}
        onClose={() => setIsRoomsModalOpen(false)}
        onSubmit={handleRoomSubmit}
      />
    </div>
  );
};

export default Canvas;
