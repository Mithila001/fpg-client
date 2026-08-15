import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  createWorkspaceSnapshot, FloorPlanWorkspace, snapWorkspaceRequestToGrid,
  type FloorPlanEditorSnapshot, type FloorPlanWorkspacePhase,
} from "../features/floor-plan-editor";
import {
  generationReducer, initialGenerationState, loadPersistedGeneration, persistGeneration,
  resolveWorkspacePhase, RoomRequirementsDialog, WorkflowSidebar, type FloorPlanRequirements,
  type WorkflowErrorInfo, type WorkflowTab,
} from "../features/floor-plan-workflow";
import { PROJECT_AREA_UNITS_PER_SQUARE_METER } from "../measurement";
import { BoundaryServiceError, calculateBuildableSpace } from "../service/boundary";
import {
  FloorPlanServiceError, cancelFloorPlanGeneration, createFloorPlanJob, getFloorPlanJob,
  subscribeToFloorPlanEvents, type FloorPlanEventSubscription,
} from "../service/floor-plan";
import { MetadataServiceError, getMetadata } from "../service/metadata";
import type {
  BuildableSpaceRequest, BuildableSpaceResult, GenerationJobDescriptor, Point, RoadType, WorkspaceMetadata,
} from "../types";

const INITIAL_LAND: BuildableSpaceRequest = {
  landBoundary: { points: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 60 }, { x: 0, y: 60 }] },
  roads: [],
};
const WORKSPACE_KEY = "fpg.workspace.v2";
interface SavedWorkspace {
  request: BuildableSpaceRequest; buildableResult: BuildableSpaceResult | null;
  requirements: FloorPlanRequirements | null; aspectRatio: string; roadType: RoadType;
}
const loadWorkspace = (): SavedWorkspace | null => {
  try { const value = localStorage.getItem(WORKSPACE_KEY); return value ? JSON.parse(value) as SavedWorkspace : null; }
  catch { return null; }
};
const area = (points: Point[]): number => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length]; return sum + point.x * next.y - next.x * point.y;
}, 0) / 2);
const centroid = (points: Point[]): Point => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
});
const scaleToArea = (points: Point[], target: number): Point[] => {
  const current = area(points); if (current <= 0) return points; const center = centroid(points);
  const factor = Math.sqrt(target / current);
  return points.map((point) => ({ x: center.x + (point.x - center.x) * factor, y: center.y + (point.y - center.y) * factor }));
};
const errorInfo = (error: unknown): WorkflowErrorInfo => {
  if (error instanceof BoundaryServiceError || error instanceof FloorPlanServiceError || error instanceof MetadataServiceError) {
    return { message: error.message, code: error.code, stage: error.stage, details: error.details };
  }
  return { message: error instanceof Error ? error.message : "An unexpected error occurred." };
};
const activeViews = new Set(["queued", "running", "cancellation_requested"]);

const FloorPlanWorkspacePage = () => {
  const saved = useMemo(loadWorkspace, []);
  const [snapshot, setSnapshot] = useState<FloorPlanEditorSnapshot>(() => createWorkspaceSnapshot(saved?.request ?? INITIAL_LAND));
  const [buildableResult, setBuildableResult] = useState<BuildableSpaceResult | null>(saved?.buildableResult ?? null);
  const [requirements, setRequirements] = useState<FloorPlanRequirements | null>(saved?.requirements ?? null);
  const [roadType, setRoadType] = useState<RoadType>(saved?.roadType ?? "main_road");
  const [aspectRatio, setAspectRatio] = useState(saved?.aspectRatio ?? "1:1");
  const [metadata, setMetadata] = useState<WorkspaceMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<WorkflowTab>(saved?.buildableResult ? "generate" : "land");
  const [targetAreaInput, setTargetAreaInput] = useState(() => (area((saved?.request ?? INITIAL_LAND).landBoundary.points) / 100).toFixed(0));
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [findingBuildable, setFindingBuildable] = useState(false);
  const [startingGeneration, setStartingGeneration] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [error, setError] = useState<WorkflowErrorInfo | null>(null);
  const [generation, dispatch] = useReducer(generationReducer, undefined, () => loadPersistedGeneration() ?? initialGenerationState);
  const subscriptionRef = useRef<FloorPlanEventSubscription | null>(null);

  useEffect(() => {
    persistGeneration(generation);
  }, [generation]);
  useEffect(() => {
    try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify({
      request: snapshot.value, buildableResult, requirements, aspectRatio, roadType,
    } satisfies SavedWorkspace)); } catch { /* Storage may be unavailable. */ }
  }, [aspectRatio, buildableResult, requirements, roadType, snapshot.value]);

  const reconcile = useCallback(async (job: GenerationJobDescriptor) => {
    try {
      const status = await getFloorPlanJob(job.statusUrl);
      dispatch({ type: "status", status });
      return status;
    } catch (requestError) {
      if (requestError instanceof FloorPlanServiceError && requestError.status === 404 && requestError.code === "job_not_found") {
        dispatch({ type: "expired", message: "This generation job has expired on the server. Start a new run to continue." });
        return null;
      }
      setError(errorInfo(requestError)); return null;
    }
  }, []);
  const connect = useCallback((job: GenerationJobDescriptor) => {
    subscriptionRef.current?.close();
    subscriptionRef.current = subscribeToFloorPlanEvents(job, {
      onConnectionChange: (connection) => {
        dispatch({ type: "connection", connection });
        if (connection === "reconnecting") void reconcile(job);
      },
      onEvent: (event) => {
        dispatch({ type: "event", event });
        if (event.eventType === "terminal") void reconcile(job);
      },
      onError: (streamError) => setError(errorInfo(streamError)),
    });
  }, [reconcile]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingMetadata(true);
    getMetadata({ signal: controller.signal }).then((result) => {
      setMetadata(result);
      if (!saved?.roadType) setRoadType(result.roadTypes.find((road) => road.value === "main_road")?.value ?? result.roadTypes[0]?.value ?? "main_road");
      if (!saved?.aspectRatio) setAspectRatio(result.compatibleAspectRatios.find((ratio) => ratio.label === "1:1")?.label ?? result.compatibleAspectRatios[0]?.label ?? "1:1");
    }).catch((requestError) => { if (!controller.signal.aborted) setError(errorInfo(requestError)); })
      .finally(() => { if (!controller.signal.aborted) setLoadingMetadata(false); });
    return () => controller.abort();
  }, [saved?.aspectRatio, saved?.roadType]);

  useEffect(() => {
    const job = generation.descriptor;
    if (!job || subscriptionRef.current || !activeViews.has(generation.view)) return;
    void reconcile(job).then((status) => {
      if (status && activeViews.has(status.state)) connect(job);
    });
  }, [connect, generation.descriptor, generation.view, reconcile]);
  useEffect(() => () => subscriptionRef.current?.close(), []);

  const invalidateLand = () => {
    setBuildableResult(null); setRequirements(null); dispatch({ type: "reset" }); setError(null);
    subscriptionRef.current?.close(); subscriptionRef.current = null;
  };
  const handleEditorChange = (next: FloorPlanEditorSnapshot) => {
    const normalized = createWorkspaceSnapshot({ ...next.value, roads: next.value.roads.map((road) => ({ ...road, roadType })) });
    const changed = JSON.stringify(normalized.value) !== JSON.stringify(snapshot.value);
    setSnapshot(normalized); if (changed && buildableResult) invalidateLand();
  };
  const applyTargetArea = () => {
    const squareMeters = Number(targetAreaInput);
    if (!Number.isFinite(squareMeters) || squareMeters <= 0) { setError({ message: "Enter a positive land area." }); return; }
    const next = createWorkspaceSnapshot(snapWorkspaceRequestToGrid({ ...snapshot.value,
      landBoundary: { points: scaleToArea(snapshot.value.landBoundary.points, squareMeters * PROJECT_AREA_UNITS_PER_SQUARE_METER) } }));
    setSnapshot(next); setTargetAreaInput((area(next.value.landBoundary.points) / 100).toFixed(1)); invalidateLand();
  };
  const findBuildable = async () => {
    const exact = createWorkspaceSnapshot(snapWorkspaceRequestToGrid(snapshot.value)); setSnapshot(exact);
    if (!exact.isValid || exact.value.roads.length !== 1) {
      setError({ message: exact.issues[0]?.message ?? "Attach exactly one entry road to a boundary edge." }); return;
    }
    setFindingBuildable(true); setError(null);
    try { setBuildableResult(await calculateBuildableSpace(exact.value)); setActiveTab("generate"); }
    catch (requestError) { setError(errorInfo(requestError)); }
    finally { setFindingBuildable(false); }
  };
  const generate = async () => {
    if (!requirements || !buildableResult) return;
    subscriptionRef.current?.close(); subscriptionRef.current = null; dispatch({ type: "reset" }); setError(null);
    setStartingGeneration(true);
    try {
      const job = await createFloorPlanJob({ floorLimits: { maxWidth: requirements.floorWidth, maxLength: requirements.floorLength },
        aspectRatio, rooms: requirements.rooms.filter((room) => room.roomType !== "hallway") });
      dispatch({ type: "job_created", descriptor: job }); connect(job);
    } catch (requestError) { setError(errorInfo(requestError)); }
    finally { setStartingGeneration(false); }
  };
  const cancel = async () => {
    if (!generation.descriptor) return; setError(null);
    try { await cancelFloorPlanGeneration(generation.descriptor); await reconcile(generation.descriptor); }
    catch (requestError) {
      if (requestError instanceof FloorPlanServiceError && requestError.status === 409) await reconcile(generation.descriptor);
      else setError(errorInfo(requestError));
    }
  };
  const reset = () => { subscriptionRef.current?.close(); subscriptionRef.current = null; dispatch({ type: "reset" }); setError(null); };
  const startFresh = () => {
    if (generation.descriptor && activeViews.has(generation.view)) {
      void cancelFloorPlanGeneration(generation.descriptor).catch(() => { /* Local reset should not be blocked by a cancellation race. */ });
    }
    subscriptionRef.current?.close(); subscriptionRef.current = null;
    const fresh = createWorkspaceSnapshot(INITIAL_LAND);
    setSnapshot(fresh); setBuildableResult(null); setRequirements(null); setActiveTab("land");
    if (metadata) {
      setRoadType(metadata.roadTypes.find((road) => road.value === "main_road")?.value ?? metadata.roadTypes[0]?.value ?? "main_road");
      setAspectRatio(metadata.compatibleAspectRatios.find((ratio) => ratio.label === "1:1")?.label ?? metadata.compatibleAspectRatios[0]?.label ?? "1:1");
    }
    setTargetAreaInput((area(INITIAL_LAND.landBoundary.points) / PROJECT_AREA_UNITS_PER_SQUARE_METER).toFixed(0));
    setRequirementsOpen(false); setFindingBuildable(false); setStartingGeneration(false); setError(null);
    dispatch({ type: "reset" });
  };

  if (!metadata) return (
    <div className="flex flex-1 items-center justify-center bg-slate-950 p-6 text-white">
      <div className="max-w-md text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
        <h1 className="mt-5 text-xl font-bold">{loadingMetadata ? "Preparing your workspace" : "Workspace unavailable"}</h1>
        <p className="mt-2 text-sm text-slate-400">{error?.message ?? "Loading the server-supported design catalog…"}</p>
        {!loadingMetadata && <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950">Try again</button>}
      </div>
    </div>
  );

  const completedResult = generation.status?.result ?? null;
  const bestResult = generation.status?.bestAvailable ?? null;
  const visibleResult = completedResult ?? (generation.showBestAvailable ? bestResult : null);
  const adverse = generation.view === "failed" || generation.view === "cancelled" || generation.view === "expired" ||
    (generation.view === "timed_out" && !generation.showBestAvailable);
  const phase: FloorPlanWorkspacePhase = resolveWorkspacePhase({
    activeTab,
    generationActive: activeViews.has(generation.view),
    startingGeneration,
    hasVisibleResult: visibleResult !== null,
    adverseResult: adverse,
    hasBuildableResult: buildableResult !== null,
  });
  const terminalOverlay = adverse ? (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 text-center shadow-2xl">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-xl font-black text-amber-700">!</span>
        <h2 className="mt-4 text-lg font-bold text-slate-950">{generation.view === "timed_out" ? "Generation timed out" : generation.view === "cancelled" ? "Generation cancelled" : generation.view === "expired" ? "Job expired" : "Generation failed"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{generation.message}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {generation.view === "timed_out" && bestResult && <button type="button" onClick={() => dispatch({ type: "show_best" })} className="flex-1 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700">View best available</button>}
          <button type="button" onClick={() => void generate()} className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Generate again</button>
        </div>
      </div>
    </div>
  ) : visibleResult && generation.view === "timed_out" ? (
    <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-amber-500 px-4 py-2 text-center text-xs font-bold text-white shadow-lg">Best available · incomplete timeout result</div>
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100 lg:overflow-hidden">
      <FloorPlanWorkspace
        phase={phase} value={snapshot.value} onChange={handleEditorChange}
        readOnly={findingBuildable || startingGeneration || buildableResult !== null || generation.view !== "idle"}
        buildableResult={buildableResult}
        generation={startingGeneration ? { message: "Starting the floor-plan generator…", hints: [], candidatePlan: null } : activeViews.has(generation.view) ? { message: generation.message, hints: generation.hints,
          candidatePlan: generation.intermediatePlan, progress: { current: generation.trialNumber ?? undefined, total: generation.trialLimit ?? undefined, label: generation.stage ?? undefined } } : null}
        finalPlan={visibleResult?.floorPlan ?? null} defaultShowDimensions canvasOverlay={activeTab === "generate" ? terminalOverlay : null}
        className="min-h-0 flex-1 lg:h-full" canvasClassName="h-[52dvh] min-h-[360px] max-h-[620px] border-b border-slate-200 lg:h-full lg:max-h-none lg:min-h-0 lg:border-b-0"
        renderSidePanel={({ landModificationControls, roadPlacementControls, editorInspector, viewerControls }) => (
          <WorkflowSidebar activeTab={activeTab} metadata={metadata} buildableResult={buildableResult}
            requirements={requirements} roadType={roadType} targetAreaInput={targetAreaInput} landArea={area(snapshot.value.landBoundary.points)}
            aspectRatio={aspectRatio} generation={generation} error={error} landModificationControls={landModificationControls}
            roadPlacementControls={roadPlacementControls} editorInspector={editorInspector}
            viewerControls={viewerControls} landValid={snapshot.isValid} findingBuildable={findingBuildable}
            startingGeneration={startingGeneration}
            onTabChange={setActiveTab} onStartFresh={startFresh} onTargetAreaInputChange={setTargetAreaInput} onApplyTargetArea={applyTargetArea}
            onRoadTypeChange={(value) => { setRoadType(value); setSnapshot(createWorkspaceSnapshot({ ...snapshot.value, roads: snapshot.value.roads.map((road) => ({ ...road, roadType: value })) })); if (buildableResult) invalidateLand(); }}
            onFindBuildableSpace={() => void findBuildable()} onEditLand={() => { invalidateLand(); setActiveTab("land"); }}
            onAspectRatioChange={setAspectRatio} onOpenRequirements={() => setRequirementsOpen(true)}
            onGenerate={() => void generate()} onCancel={() => void cancel()} />
        )} />
      {buildableResult && <RoomRequirementsDialog open={requirementsOpen} metadata={metadata}
        maxWidth={buildableResult.usableLand.width} maxLength={buildableResult.usableLand.length}
        initialValue={requirements} onClose={() => setRequirementsOpen(false)}
        onSave={(value) => { setRequirements(value); setRequirementsOpen(false); reset(); }} />}
    </div>
  );
};
export default FloorPlanWorkspacePage;
