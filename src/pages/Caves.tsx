import React, { useEffect, useMemo, useRef, useState } from "react";
import CavesCanvas from "../components/Konva/CavesCanvas";
import type { RoomPoints, CornerKey } from "../components/Konva/InputPlanCanvas";
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
} from "../api/getUsableLand";
import {
  submitFormatV2Job,
  fetchFormatV2JobState,
  formatResultToSegments,
  roomCentersFromResult,
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
import LoadingOverlay from "../components/LoadingOverlay";

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

const Caves: React.FC = () => {
  const [points, setPoints] = useState<RoomPoints>({
    A: { x: 140, y: 140 },
    B: { x: 460, y: 140 },
    C: { x: 460, y: 380 },
    D: { x: 140, y: 380 },
    E: { x: 300, y: 500 },
    F: { x: 520, y: 300 },
  });
  const [borderCount, setBorderCount] = useState(4);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedBasePoints, setConfirmedBasePoints] = useState<RoomPoints | null>(null);
  const [targetAreaInput, setTargetAreaInput] = useState<string>("");
  const [lastAppliedArea, setLastAppliedArea] = useState<number | null>(null);
  const [scaleError, setScaleError] = useState<string | null>(null);
  const [roadMode, setRoadMode] = useState<"idle" | "placing">("idle");
  const [placedRoads, setPlacedRoads] = useState<RoadPlacement[]>([]);
  const [runAlgoStatus, setRunAlgoStatus] = useState<string | null>(null);
  const [isRunningAlgorithm, setIsRunningAlgorithm] = useState(false);
  const [buildableRectangleVertices, setBuildableRectangleVertices] = useState<
    UsableLandPoint[] | null
  >(null);
  const [shrunkBoundary, setShrunkBoundary] = useState<UsableLandPoint[] | null>(null);
  const [buildableRectangleSize, setBuildableRectangleSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const buildableEventSourceRef = useRef<EventSource | null>(null);
  const buildablePollRef = useRef<number | null>(null);

  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  const [submittedRequirements, setSubmittedRequirements] =
    useState<SubmittedRoomRequirements | null>(null);

  const [segments, setSegments] = useState<Coordinate[][] | null>(null);
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [openings, setOpenings] = useState<CanvasOpening[] | null>(null);
  const [roomCenters, setRoomCenters] = useState<Coordinate[] | null>(null);
  const [isGeneratingFloorPlan, setIsGeneratingFloorPlan] = useState(false);
  const [floorPlanStatus, setFloorPlanStatus] = useState<string | null>(null);
  const [floorPlanError, setFloorPlanError] = useState<string | null>(null);
  const [showFloorPlanView, setShowFloorPlanView] = useState(false);
  const [floorPlanEvents, setFloorPlanEvents] = useState<JobEventPayload[]>([]);
  const [floorPlanJobId, setFloorPlanJobId] = useState<string | null>(null);
  const floorPlanEventSourceRef = useRef<EventSource | null>(null);

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

  const clearAlgorithmResultState = () => {
    setBuildableRectangleVertices(null);
    setShrunkBoundary(null);
    setBuildableRectangleSize(null);
    setRunAlgoStatus(null);
  };

  const clearFloorPlanVisuals = (message?: string) => {
    setSegments(null);
    setLabels(null);
    setOpenings(null);
    setRoomCenters(null);
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

  const appendEvents = (
    setter: React.Dispatch<React.SetStateAction<JobEventPayload[]>>,
    event: JobEventPayload,
  ) => {
    setter((prev) => {
      const next = [...prev, event];
      return next.slice(-8);
    });
  };

  const eventDisplay = (event: JobEventPayload): string => {
    if (event.message) return event.message;
    if (event.event) return event.event;
    return "Processing...";
  };

  const isTerminalEvent = (eventName?: string): boolean => {
    return eventName === "success" || eventName === "time_out" || eventName === "fpg_low_score";
  };

  useEffect(() => {
    return () => {
      closeBuildableStream();
      stopBuildablePolling();
      closeFloorPlanStream();
    };
  }, []);

  const addBorderLine = () => {
    if (isConfirmed || borderCount >= MAX_BORDERS) return;
    setBorderCount((prev) => Math.min(MAX_BORDERS, prev + 1));
    clearAlgorithmResultState();
    invalidateFloorPlanFromStepA();
  };

  const removeBorderLine = () => {
    if (isConfirmed || borderCount <= MIN_BORDERS) return;
    setBorderCount((prev) => Math.max(MIN_BORDERS, prev - 1));
    clearAlgorithmResultState();
    invalidateFloorPlanFromStepA();
  };

  const handlePointsChange = (nextPoints: RoomPoints) => {
    setPoints(nextPoints);
    clearAlgorithmResultState();
    invalidateFloorPlanFromStepA();
  };

  const handleConfirmShape = () => {
    if (isRunningAlgorithm || isGeneratingFloorPlan) return;
    setIsConfirmed(true);
    setConfirmedBasePoints(points);
  };

  const handleEditShape = () => {
    if (isRunningAlgorithm || isGeneratingFloorPlan) return;
    setIsConfirmed(false);
    if (confirmedBasePoints) {
      setPoints(confirmedBasePoints);
    }
    setConfirmedBasePoints(null);
    setTargetAreaInput("");
    setLastAppliedArea(null);
    setScaleError(null);
    setRoadMode("idle");
    setPlacedRoads([]);
    clearAlgorithmResultState();
    invalidateFloorPlanFromStepA();
  };

  const handleApplyArea = () => {
    if (isRunningAlgorithm || isGeneratingFloorPlan) return;
    if (!confirmedBasePoints) return;

    const targetAreaCm2 = parseAreaM2InputToCm2(targetAreaInput);
    if (targetAreaCm2 === null || targetAreaCm2 <= 0) {
      setScaleError("Please enter a valid positive number for area (m2).");
      return;
    }

    const baseArea = calculatePolygonArea(confirmedBasePoints, orderedKeys);
    if (baseArea <= 0) {
      setScaleError("Base polygon has zero area.");
      return;
    }

    const scale = Math.sqrt(targetAreaCm2 / baseArea);
    const centroid = calculatePolygonCentroid(confirmedBasePoints, orderedKeys);
    const scaledPoints = scalePolygon(confirmedBasePoints, orderedKeys, centroid, scale);

    setPoints(scaledPoints);
    setLastAppliedArea(targetAreaCm2);
    setScaleError(null);
    clearAlgorithmResultState();
    invalidateFloorPlanFromStepA();
  };

  const handleRoadButtonClick = () => {
    if (isRunningAlgorithm || isGeneratingFloorPlan) return;
    if (!isConfirmed || lastAppliedArea === null) return;
    setRoadMode((prev) => (prev === "placing" ? "idle" : "placing"));
  };

  const handleRoadPlace = (placement: RoadPlacement) => {
    setPlacedRoads([placement]);
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

      setBuildableRectangleVertices(nextRectangle.length > 0 ? nextRectangle : null);
      setShrunkBoundary(nextBoundary.length > 0 ? nextBoundary : null);
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
          roadType: "mainRoad",
        };
      })
      .filter((item): item is UsableLandRoadConnectedSegment => item !== null);

    const payload: BuildableSpaceRequest = {
      area,
      segmentsCoordinates: buildClosedLoopCoordinates(points, orderedKeys),
      roadConnected,
      min_width: 100,
      min_height: 100,
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
      const message = error instanceof Error ? error.message : "Unable to run algorithm.";
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

  const finalizeFloorPlanJob = async (jobId: string) => {
    try {
      const state = await fetchFormatV2JobState(jobId);
      const result = state.result;

      if (!result) {
        setFloorPlanError(`Job finished with status ${state.status}, but no result was returned.`);
        setFloorPlanStatus(`Job ended with status ${state.status}.`);
        return;
      }

      setSegments(formatResultToSegments(result));
      setLabels(roomsToLabels(result));
      setOpenings(roomsToOpenings(result));
      setRoomCenters(roomCentersFromResult(result));
      setFloorPlanStatus(result.message || "Floor plan generated successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to finalize floor plan.";
      setFloorPlanError(message);
      setFloorPlanStatus(`Failed to generate floor plan: ${message}`);
    } finally {
      setIsGeneratingFloorPlan(false);
    }
  };

  const handleGenerateFloorPlan = async () => {
    if (!submittedRequirements || isGeneratingFloorPlan || isRunningAlgorithm) return;

    closeFloorPlanStream();
    setShowFloorPlanView(true);
    setIsGeneratingFloorPlan(true);
    setFloorPlanError(null);
    setFloorPlanStatus("Submitting floor plan job...");
    setFloorPlanEvents([]);
    setFloorPlanJobId(null);

    setSegments(null);
    setLabels(null);
    setOpenings(null);
    setRoomCenters(null);

    try {
      const submission = await submitFormatV2Job(submittedRequirements.payload);
      setFloorPlanJobId(submission.job_id);
      setFloorPlanStatus(submission.message || `Floor plan job submitted (${submission.job_id}).`);

      floorPlanEventSourceRef.current = subscribeToJobEvents(
        submission.job_id,
        (event) => {
          appendEvents(setFloorPlanEvents, event);
          setFloorPlanStatus(eventDisplay(event));

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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex w-[72%] min-w-0 flex-col gap-2 bg-slate-100 p-2">
          <div className="text-sm text-slate-700">
            {canvasMode === "edit"
              ? "Step A: Land Boundary Workspace"
              : "Step B: Floor Plan Preview"}
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded border border-slate-200 bg-white p-1">
            <CavesCanvas
              mode={canvasMode}
              editState={{
                points,
                borderCount,
                editable: !isConfirmed,
                roadMode,
                placedRoad: placedRoads[0] ?? null,
                buildableRectangle: buildableRectangleVertices,
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
                isLoading: isGeneratingFloorPlan,
                status: floorPlanStatus,
              }}
            />
            <LoadingOverlay
              isOpen={isGeneratingFloorPlan}
              title="Generating Floor Plan"
              subtitle={
                floorPlanJobId ? `Job ID: ${floorPlanJobId}` : "Waiting for server response"
              }
              events={floorPlanEvents}
            />
          </div>
        </div>

        <div className="w-[28%] min-w-[320px] overflow-auto border-l border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-4">
            <section className="rounded-md border border-slate-200 p-3">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">Step A: Land Setup</h2>
              <div className="text-xs text-slate-600">Land border lines: {borderCount}</div>
              <div className="mt-1 wrap-break-word text-xs text-slate-500">{shapeSummary}</div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleConfirmShape}
                  disabled={isConfirmed || isRunningAlgorithm || isGeneratingFloorPlan}
                  className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirm Shape
                </button>
                <button
                  onClick={handleEditShape}
                  disabled={!isConfirmed || isRunningAlgorithm || isGeneratingFloorPlan}
                  className="rounded bg-amber-500 px-3 py-2 text-sm text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit
                </button>
              </div>
            </section>

            <section className="rounded-md border border-slate-200 p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Target Land Area</h3>
              {!isConfirmed ? (
                <p className="text-xs text-slate-500">Confirm shape to set target land area.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="text-xs text-slate-600">
                    Current Area:{" "}
                    <span className="font-semibold">{formatAreaFromCm2(currentArea, 2)}</span>
                  </div>

                  <label className="flex flex-col gap-1 text-xs text-slate-700">
                    Target Area (m2)
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={targetAreaInput}
                      onChange={(event) => setTargetAreaInput(event.target.value)}
                      disabled={isRunningAlgorithm || isGeneratingFloorPlan}
                      className="rounded border border-slate-300 px-3 py-2 text-sm"
                      placeholder="e.g. 50"
                    />
                  </label>

                  {scaleError && <div className="text-xs text-red-600">{scaleError}</div>}

                  <button
                    onClick={handleApplyArea}
                    disabled={isRunningAlgorithm || isGeneratingFloorPlan}
                    className="w-full rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    Apply Area
                  </button>

                  <button
                    onClick={handleRoadButtonClick}
                    disabled={
                      !isConfirmed ||
                      lastAppliedArea === null ||
                      isRunningAlgorithm ||
                      isGeneratingFloorPlan
                    }
                    className="w-full rounded bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {roadMode === "placing" ? "Cancel Road" : "Add Road"}
                  </button>

                  {roadMode === "placing" && (
                    <div className="text-[11px] text-slate-600">
                      Place Road mode active. Hover near a boundary segment, left click to place,
                      right click to cancel.
                    </div>
                  )}

                  {placedRoads.length > 0 && roadMode !== "placing" && (
                    <div className="text-[11px] text-emerald-700">
                      Road placed on border segment {placedRoads[0].segmentIndex + 1}.
                    </div>
                  )}

                  {placedRoads.length > 0 && (
                    <button
                      onClick={handleRunAlgorithm}
                      disabled={isRunningAlgorithm || isGeneratingFloorPlan}
                      className="w-full rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRunningAlgorithm ? "Running..." : "Run Algorithm"}
                    </button>
                  )}

                  {runAlgoStatus && (
                    <div className="text-[11px] text-indigo-700">{runAlgoStatus}</div>
                  )}

                  {buildableRectangleSize && (
                    <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
                      Usable rectangle: {formatLengthFromCm(buildableRectangleSize.width, 2)} x{" "}
                      {formatLengthFromCm(buildableRectangleSize.height, 2)}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-md border border-slate-200 p-3">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Step B: Rooms and Generation
              </h2>

              <button
                onClick={handleOpenConfigureRooms}
                disabled={!buildableRectangleSize || isRunningAlgorithm || isGeneratingFloorPlan}
                className="w-full rounded bg-cyan-600 px-3 py-2 text-sm text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Configure Rooms
              </button>

              {!buildableRectangleSize && (
                <div className="mt-2 text-xs text-amber-700">
                  Complete Step A and run algorithm before configuring rooms.
                </div>
              )}

              <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                <div className="font-medium text-slate-800">Saved Room Requirements</div>
                <div>{submittedRequirements?.roomSummary ?? "Not submitted yet."}</div>
                <div>
                  Floor Size:{" "}
                  {submittedRequirements
                    ? `${submittedRequirements.floorWidthCm / 100} m x ${submittedRequirements.floorHeightCm / 100} m`
                    : "Not set"}
                </div>
              </div>

              <button
                onClick={handleGenerateFloorPlan}
                disabled={!submittedRequirements || isRunningAlgorithm || isGeneratingFloorPlan}
                className="mt-3 w-full rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingFloorPlan ? "Generating..." : "Generate Floor Plan"}
              </button>

              {showFloorPlanView && (
                <button
                  onClick={() => setShowFloorPlanView(false)}
                  disabled={isGeneratingFloorPlan}
                  className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Back to Step A View
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
        onClose={() => setIsRoomsModalOpen(false)}
        onSubmit={handleRoomSubmit}
      />
    </div>
  );
};

export default Caves;
