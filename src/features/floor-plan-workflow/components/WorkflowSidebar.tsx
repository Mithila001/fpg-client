import {
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { formatProjectArea, formatProjectLength } from "../../../measurement";
import type {
  BuildableSpaceResult,
  RoadType,
  WorkspaceMetadata,
} from "../../../types";
import type { FloorPlanEditorSnapshot } from "../../floor-plan-editor";
import type {
  FloorPlanRequirements,
  WorkflowActivity,
  WorkflowErrorInfo,
  WorkflowTab,
} from "../workflow.types";

interface WorkflowSidebarProps {
  activeTab: WorkflowTab;
  snapshot: FloorPlanEditorSnapshot;
  landArea: number;
  targetAreaInput: string;
  roadType: RoadType;
  metadata: WorkspaceMetadata;
  buildableResult: BuildableSpaceResult | null;
  aspectRatio: string;
  requirements: FloorPlanRequirements | null;
  activity: WorkflowActivity;
  generationMessage: string;
  jobId: string | null;
  error: WorkflowErrorInfo | null;
  finalScoring: { totalScore: number; passedCritical: boolean } | null;
  progress: { current?: number; total?: number; label?: string } | null;
  hasFinalPlan: boolean;
  noResult: boolean;
  landEditorControls: ReactNode;
  viewerControls: ReactNode;
  onTabChange: (tab: WorkflowTab) => void;
  onTargetAreaInputChange: (value: string) => void;
  onApplyTargetArea: () => void;
  onRoadTypeChange: (roadType: RoadType) => void;
  onFindBuildableSpace: () => void;
  onEditLand: () => void;
  onAspectRatioChange: (value: string) => void;
  onOpenRequirements: () => void;
  onGenerate: () => void;
  onCancelGeneration: () => void;
  onResetGeneration: () => void;
}

const sectionClassName =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";

export const WorkflowSidebar = ({
  activeTab,
  snapshot,
  landArea,
  targetAreaInput,
  roadType,
  metadata,
  buildableResult,
  aspectRatio,
  requirements,
  activity,
  generationMessage,
  jobId,
  error,
  finalScoring,
  progress,
  hasFinalPlan,
  noResult,
  landEditorControls,
  viewerControls,
  onTabChange,
  onTargetAreaInputChange,
  onApplyTargetArea,
  onRoadTypeChange,
  onFindBuildableSpace,
  onEditLand,
  onAspectRatioChange,
  onOpenRequirements,
  onGenerate,
  onCancelGeneration,
  onResetGeneration,
}: WorkflowSidebarProps) => {
  const landTabRef = useRef<HTMLButtonElement>(null);
  const generateTabRef = useRef<HTMLButtonElement>(null);
  const busy =
    activity === "finding-buildable-space" ||
    activity === "generating" ||
    activity === "cancelling";
  const canFindBuildable =
    snapshot.isValid && snapshot.value.roads.length === 1 && !busy;
  const canConfigure = buildableResult !== null && !busy;
  const canGenerate = requirements !== null && buildableResult !== null && !busy;
  const progressPercent =
    progress?.current !== undefined &&
    progress.total !== undefined &&
    progress.total > 0
      ? Math.min(100, Math.max(0, (progress.current / progress.total) * 100))
      : null;

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    tab: WorkflowTab,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextTab =
      event.key === "Home"
        ? "land"
        : event.key === "End"
          ? "generate"
          : tab === "land"
            ? "generate"
            : "land";
    onTabChange(nextTab);
    (nextTab === "land" ? landTabRef : generateTabRef).current?.focus();
  };

  return (
    <aside className="flex min-h-0 flex-col border-t border-slate-200 bg-slate-50 lg:h-full lg:border-l lg:border-t-0">
      <div
        role="tablist"
        aria-label="Floor-plan workflow"
        className="grid shrink-0 grid-cols-2 border-b border-slate-200 bg-white p-2"
      >
        {(["land", "generate"] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              ref={tab === "land" ? landTabRef : generateTabRef}
              id={`${tab}-tab`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${tab}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => onTabChange(tab)}
              onKeyDown={(event) => handleTabKeyDown(event, tab)}
              className={`rounded-lg px-4 py-3 text-sm font-bold transition-colors ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab === "land" ? "Land" : "Generate"}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div
          id="land-panel"
          role="tabpanel"
          aria-labelledby="land-tab"
          hidden={activeTab !== "land"}
          className="space-y-4"
        >
          {landEditorControls}

          <section className={sectionClassName}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Land setup</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Define a valid convex boundary and one entry road.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {snapshot.value.landBoundary.points.length} vertices
              </span>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <span className="block text-xs text-slate-500">Current area</span>
              <strong className="mt-1 block text-slate-900">
                {formatProjectArea(landArea, "square-meter")}
              </strong>
            </div>

            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Target land area (m²)
              <div className="mt-1.5 flex gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={targetAreaInput}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onTargetAreaInputChange(event.target.value)
                  }
                  disabled={busy}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                />
                <button
                  type="button"
                  onClick={onApplyTargetArea}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </label>

            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Road type
              <select
                value={roadType}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onRoadTypeChange(event.target.value as RoadType)
                }
                disabled={busy}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100"
              >
                {metadata.roadTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.displayName}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {snapshot.value.roads.length === 1
                ? `Road attached to edge ${snapshot.value.roads[0].boundaryEdgeIndex + 1}.`
                : "Choose Place road in the editor controls, then click near a boundary edge."}
            </div>

            {!snapshot.isValid && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {snapshot.issues[0]?.message ?? "The land boundary is invalid."}
              </div>
            )}

            <button
              type="button"
              onClick={onFindBuildableSpace}
              disabled={!canFindBuildable}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {activity === "finding-buildable-space"
                ? "Finding buildable space…"
                : "Find buildable space"}
            </button>
          </section>

          {buildableResult && (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <h2 className="font-bold">Usable rectangle ready</h2>
              <p className="mt-1 text-xs leading-5 text-emerald-700">
                {formatProjectLength(buildableResult.usableLand.width, "meter")} ×{" "}
                {formatProjectLength(buildableResult.usableLand.length, "meter")}
                <br />
                {formatProjectArea(
                  buildableResult.usableLand.area,
                  "square-meter",
                )}
              </p>
              <button
                type="button"
                onClick={onEditLand}
                disabled={busy}
                className="mt-3 text-xs font-bold underline underline-offset-2 disabled:opacity-50"
              >
                Edit land again
              </button>
            </section>
          )}
        </div>

        <div
          id="generate-panel"
          role="tabpanel"
          aria-labelledby="generate-tab"
          hidden={activeTab !== "generate"}
          className="space-y-4"
        >
          <section className={sectionClassName}>
            <h2 className="text-sm font-bold text-slate-900">
              Floor-plan generation
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Configure server-supported rooms, then follow the live generation
              stream.
            </p>

            {!buildableResult ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Find the buildable space in the Land tab first.
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                Available floor:{" "}
                <strong className="text-slate-900">
                  {formatProjectLength(
                    buildableResult.usableLand.width,
                    "meter",
                  )}{" "}
                  ×{" "}
                  {formatProjectLength(
                    buildableResult.usableLand.length,
                    "meter",
                  )}
                </strong>
              </div>
            )}

            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Aspect ratio
              <select
                value={aspectRatio}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onAspectRatioChange(event.target.value)
                }
                disabled={!buildableResult || busy}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
              >
                {metadata.compatibleAspectRatios.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onOpenRequirements}
              disabled={!canConfigure}
              className="mt-4 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {requirements ? "Edit room requirements" : "Configure rooms"}
            </button>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Requirements
              </p>
              {requirements ? (
                <>
                  <p className="mt-2 text-xs leading-5 text-slate-700">
                    {requirements.summary}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-900">
                    Floor{" "}
                    {formatProjectLength(requirements.floorWidth, "meter")} ×{" "}
                    {formatProjectLength(requirements.floorLength, "meter")}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Not configured.</p>
              )}
            </div>

            {activity === "generating" || activity === "cancelling" ? (
              <button
                type="button"
                onClick={onCancelGeneration}
                disabled={!jobId || activity === "cancelling"}
                className="mt-4 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {activity === "cancelling"
                  ? "Requesting cancellation…"
                  : "Stop generation"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onGenerate}
                disabled={!canGenerate}
                className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {hasFinalPlan ? "Generate again" : "Generate floor plan"}
              </button>
            )}
          </section>

          {(generationMessage || progress) && (
            <section className={sectionClassName} aria-live="polite">
              <h2 className="text-sm font-bold text-slate-900">Generation status</h2>
              {generationMessage && (
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {generationMessage}
                </p>
              )}
              {progress && (
                <div className="mt-3">
                  <div className="flex justify-between gap-2 text-xs text-slate-500">
                    <span>{progress.label ?? "Progress"}</span>
                    {progress.current !== undefined &&
                      progress.total !== undefined && (
                        <span>
                          {progress.current}/{progress.total}
                        </span>
                      )}
                  </div>
                  {progressPercent !== null && (
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-[width]"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {noResult && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              The generation run completed without a usable floor plan. Adjust
              the requirements and try again.
            </section>
          )}

          {finalScoring && (
            <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-800">
              Final score: <strong>{finalScoring.totalScore.toFixed(2)}</strong>
              {finalScoring.passedCritical
                ? " · Critical checks passed"
                : " · Critical checks failed"}
            </section>
          )}

          {viewerControls}

          {(hasFinalPlan || requirements) && !busy && (
            <button
              type="button"
              onClick={onResetGeneration}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Clear generation result
            </button>
          )}
        </div>

        {error && (
          <section
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm"
            role="alert"
          >
            <strong className="block">Request failed</strong>
            <span className="mt-1 block text-xs leading-5">{error.message}</span>
            {(error.code || error.stage || error.flowId) && (
              <dl className="mt-2 grid gap-1 text-xs">
                {error.code && (
                  <div>
                    <dt className="inline font-semibold">Code: </dt>
                    <dd className="inline">{error.code}</dd>
                  </div>
                )}
                {error.stage && (
                  <div>
                    <dt className="inline font-semibold">Stage: </dt>
                    <dd className="inline">{error.stage}</dd>
                  </div>
                )}
                {error.flowId && (
                  <div>
                    <dt className="inline font-semibold">Flow ID: </dt>
                    <dd className="inline break-all">{error.flowId}</dd>
                  </div>
                )}
              </dl>
            )}
            {error.details !== undefined && (
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer font-semibold">
                  Technical details
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white/60 p-2 font-mono text-[11px]">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </details>
            )}
          </section>
        )}
      </div>
    </aside>
  );
};
