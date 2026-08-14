import type { ChangeEvent, ReactNode } from "react";
import { formatProjectArea, formatProjectLength } from "../../../measurement";
import type { BuildableSpaceResult, RoadType, WorkspaceMetadata } from "../../../types";
import type { FloorPlanRequirements, WorkflowErrorInfo, WorkflowTab } from "../workflow.types";
import type { GenerationRunState } from "../generation-state";

interface WorkflowSidebarProps {
  activeTab: WorkflowTab; metadata: WorkspaceMetadata; buildableResult: BuildableSpaceResult | null;
  requirements: FloorPlanRequirements | null; roadType: RoadType; targetAreaInput: string;
  landArea: number; aspectRatio: string; generation: GenerationRunState; error: WorkflowErrorInfo | null;
  landEditorControls: ReactNode; viewerControls: ReactNode; landValid: boolean; findingBuildable: boolean;
  onTabChange: (tab: WorkflowTab) => void; onTargetAreaInputChange: (value: string) => void;
  onApplyTargetArea: () => void; onRoadTypeChange: (value: RoadType) => void;
  onFindBuildableSpace: () => void; onEditLand: () => void; onAspectRatioChange: (value: string) => void;
  onOpenRequirements: () => void; onGenerate: () => void; onCancel: () => void; onReset: () => void;
}
const running = new Set(["queued", "running", "cancellation_requested"]);
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const WorkflowSidebar = (props: WorkflowSidebarProps) => {
  const busy = props.findingBuildable || running.has(props.generation.view);
  const progress = props.generation.trialNumber !== null && props.generation.trialLimit
    ? Math.min(100, (props.generation.trialNumber / props.generation.trialLimit) * 100) : null;
  return (
    <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white lg:h-full">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-4 backdrop-blur">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Design workspace</p>
        <div className="mt-3 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          {(["land", "generate"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => props.onTabChange(tab)}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${props.activeTab === tab ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>
              {tab === "land" ? "1 · Land" : "2 · Generate"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {props.activeTab === "land" ? (
          <>
            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-950">Parcel geometry</h2>
                <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">
                  {formatProjectArea(props.landArea, "square-meter")}
                </span>
              </div>
              <label className="mt-4 block text-xs font-semibold text-slate-600">Target area (m²)
                <div className="mt-1.5 flex gap-2">
                  <input type="number" min="1" step="1" value={props.targetAreaInput}
                    onChange={(event) => props.onTargetAreaInputChange(event.target.value)}
                    disabled={busy || props.buildableResult !== null}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  <button type="button" onClick={props.onApplyTargetArea} disabled={busy || props.buildableResult !== null}
                    className="rounded-xl border border-slate-300 px-3 text-xs font-bold disabled:opacity-40">Apply</button>
                </div>
              </label>
              <label className="mt-3 block text-xs font-semibold text-slate-600">Entry road
                <select value={props.roadType} disabled={busy || props.buildableResult !== null}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => props.onRoadTypeChange(event.target.value as RoadType)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                  {props.metadata.roadTypes.map((road) => <option key={road.value} value={road.value}>{road.displayName}</option>)}
                </select>
              </label>
            </section>
            {props.landEditorControls}
            {props.buildableResult ? (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <h2 className="font-bold">Buildable envelope ready</h2>
                <p className="mt-1 text-xs">{formatProjectLength(props.buildableResult.usableLand.width, "meter")} × {formatProjectLength(props.buildableResult.usableLand.length, "meter")}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => props.onTabChange("generate")} className="flex-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Continue</button>
                  <button type="button" onClick={props.onEditLand} className="rounded-xl border border-emerald-300 px-3 py-2 text-xs font-bold">Edit</button>
                </div>
              </section>
            ) : (
              <button type="button" onClick={props.onFindBuildableSpace} disabled={!props.landValid || busy}
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">
                {props.findingBuildable ? "Calculating setbacks…" : "Find buildable space"}
              </button>
            )}
          </>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 p-4">
              <h2 className="font-bold text-slate-950">Plan requirements</h2>
              {!props.buildableResult ? <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Complete the land step first.</p> : (
                <>
                  <label className="mt-4 block text-xs font-semibold text-slate-600">Aspect ratio
                    <select value={props.aspectRatio} disabled={busy}
                      onChange={(event) => props.onAspectRatioChange(event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                      {props.metadata.compatibleAspectRatios.map((ratio) => <option key={ratio.label}>{ratio.label}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={props.onOpenRequirements} disabled={busy}
                    className="mt-3 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-bold text-indigo-700">
                    {props.requirements ? "Edit room requirements" : "Configure rooms"}
                  </button>
                  {props.requirements && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{props.requirements.summary}</p>}
                </>
              )}
            </section>

            {props.generation.view !== "idle" && (
              <section className="rounded-2xl border border-slate-200 p-4" aria-live="polite">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold text-slate-950">Live generation</h2>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${props.generation.connection === "open" ? "bg-emerald-50 text-emerald-700" : props.generation.connection === "reconnecting" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                    {props.generation.connection}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{props.generation.message || label(props.generation.view)}</p>
                {progress !== null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-indigo-600 transition-[width]" style={{ width: `${progress}%` }} /></div>}
                {props.generation.warning && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{props.generation.warning}</p>}
                <ol className="mt-4 max-h-64 space-y-3 overflow-y-auto border-l border-slate-200 pl-4">
                  {props.generation.timeline.slice().reverse().map((entry) => (
                    <li key={entry.sequence} className="relative text-xs">
                      <span className={`absolute -left-[20.5px] top-1 h-2 w-2 rounded-full ${entry.severity === "error" ? "bg-rose-500" : entry.severity === "warning" ? "bg-amber-500" : entry.severity === "success" ? "bg-emerald-500" : "bg-indigo-400"}`} />
                      <p className="font-semibold text-slate-700">{entry.message}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">#{entry.sequence} · {label(entry.stage)}{entry.trialNumber ? ` · Trial ${entry.trialNumber}` : ""}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {(props.generation.status?.result || props.generation.status?.bestAvailable) && (() => {
              const result = props.generation.status?.result ?? props.generation.status?.bestAvailable;
              if (!result) return null;
              return (
                <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">{result.classification} plan</p>
                      <h2 className="mt-1 font-black">Score {result.scoring.totalScore.toFixed(1)}</h2>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${result.scoring.passedCritical ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {result.scoring.passedCritical ? "Critical checks passed" : "Critical check failed"}
                    </span>
                  </div>
                  {result.scoring.criticalFailure && (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-white/70 p-3 text-xs text-rose-800">
                      <strong>{result.scoring.criticalFailure.code}</strong>
                      <p className="mt-1">{result.scoring.criticalFailure.message}</p>
                    </div>
                  )}
                </section>
              );
            })()}
            {props.viewerControls}
            {running.has(props.generation.view) ? (
              <button type="button" onClick={props.onCancel} disabled={props.generation.view === "cancellation_requested"}
                className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
                {props.generation.view === "cancellation_requested" ? "Cancellation requested…" : "Stop generation"}
              </button>
            ) : (
              <button type="button" onClick={props.onGenerate} disabled={!props.requirements || !props.buildableResult}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 disabled:opacity-40">
                {props.generation.view === "idle" ? "Generate floor plan" : "Generate again"}
              </button>
            )}
            {props.generation.view !== "idle" && !running.has(props.generation.view) &&
              <button type="button" onClick={props.onReset} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600">Clear result</button>}
          </>
        )}
        {props.error && <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <strong className="block text-sm">Request failed</strong><span className="mt-1 block">{props.error.message}</span>
          {props.error.code && <code className="mt-2 block">{props.error.code}</code>}
        </section>}
      </div>
    </aside>
  );
};
