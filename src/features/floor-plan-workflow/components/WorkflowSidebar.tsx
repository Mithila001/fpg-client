import type { ChangeEvent, ReactNode } from "react";
import { formatProjectArea, formatProjectLength } from "../../../measurement";
import type { BuildableSpaceResult, RoadType, WorkspaceMetadata } from "../../../types";
import type { FloorPlanRequirements, WorkflowErrorInfo, WorkflowTab } from "../workflow.types";
import type { GenerationRunState } from "../generation-state";

interface WorkflowSidebarProps {
  activeTab: WorkflowTab; metadata: WorkspaceMetadata; buildableResult: BuildableSpaceResult | null;
  requirements: FloorPlanRequirements | null; roadType: RoadType; targetAreaInput: string;
  landArea: number; aspectRatio: string; generation: GenerationRunState; error: WorkflowErrorInfo | null;
  landModificationControls: ReactNode; roadPlacementControls: ReactNode; editorInspector: ReactNode;
  viewerControls: ReactNode; landValid: boolean; findingBuildable: boolean;
  startingGeneration: boolean;
  onTabChange: (tab: WorkflowTab) => void; onStartFresh: () => void;
  onTargetAreaInputChange: (value: string) => void; onApplyTargetArea: () => void;
  onRoadTypeChange: (value: RoadType) => void; onFindBuildableSpace: () => void;
  onEditLand: () => void; onAspectRatioChange: (value: string) => void;
  onOpenRequirements: () => void; onGenerate: () => void; onCancel: () => void;
}

const running = new Set(["queued", "running", "cancellation_requested"]);
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const SectionTitle = ({ index, children }: { index: number; children: ReactNode }) => (
  <div className="mb-3 flex items-center gap-2">
    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-[10px] font-black text-indigo-700">{index}</span>
    <h2 className="text-sm font-black text-slate-950">{children}</h2>
  </div>
);

export const WorkflowSidebar = (props: WorkflowSidebarProps) => {
  const busy = props.findingBuildable || props.startingGeneration || running.has(props.generation.view);
  const progress = props.generation.trialNumber !== null && props.generation.trialLimit
    ? Math.min(100, (props.generation.trialNumber / props.generation.trialLimit) * 100) : null;
  const activeGeneration = props.startingGeneration || props.generation.view !== "idle";
  const terminalGeneration = !props.startingGeneration && !running.has(props.generation.view) && activeGeneration;
  const generationSucceeded = props.generation.view === "completed";
  const generationTimedOut = props.generation.view === "timed_out";

  return (
    <aside className="min-h-0 border-t border-slate-200 bg-white lg:h-full lg:overflow-y-auto lg:border-l lg:border-t-0">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Design workspace</p>
          <button type="button" onClick={props.onStartFresh}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-black text-indigo-700 transition hover:bg-indigo-100">
            Start fresh
          </button>
        </div>
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
          props.buildableResult ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <SectionTitle index={3}>Buildable area ready</SectionTitle>
              <p className="text-xs leading-5 text-emerald-800">The blue floor envelope is the space available to generation.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/70 p-3"><span className="block text-[10px] text-emerald-700">Width</span><strong>{formatProjectLength(props.buildableResult.usableLand.width, "meter")}</strong></div>
                <div className="rounded-xl bg-white/70 p-3"><span className="block text-[10px] text-emerald-700">Length</span><strong>{formatProjectLength(props.buildableResult.usableLand.length, "meter")}</strong></div>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => props.onTabChange("generate")} className="flex-1 rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white">Continue to generation</button>
                <button type="button" onClick={props.onEditLand} className="rounded-xl border border-emerald-300 bg-white/60 px-3 py-2.5 text-xs font-bold">Edit land</button>
              </div>
            </section>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <SectionTitle index={1}>Land modification</SectionTitle>
                  <span className="mb-3 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">{formatProjectArea(props.landArea, "square-meter")}</span>
                </div>
                <label className="mb-3 block text-xs font-semibold text-slate-600">Target area (m²)
                  <div className="mt-1.5 flex gap-2">
                    <input type="number" min="1" step="1" value={props.targetAreaInput}
                      onChange={(event) => props.onTargetAreaInputChange(event.target.value)} disabled={busy}
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    <button type="button" onClick={props.onApplyTargetArea} disabled={busy}
                      className="rounded-xl border border-slate-300 px-3 text-xs font-bold disabled:opacity-40">Apply</button>
                  </div>
                </label>
                {props.landModificationControls}
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <SectionTitle index={2}>Road placement</SectionTitle>
                <label className="block text-xs font-semibold text-slate-600">Entry road type
                  <select value={props.roadType} disabled={busy}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => props.onRoadTypeChange(event.target.value as RoadType)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                    {props.metadata.roadTypes.map((road) => <option key={road.value} value={road.value}>{road.displayName}</option>)}
                  </select>
                </label>
                {props.roadPlacementControls}
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <SectionTitle index={3}>Finalize land</SectionTitle>
                {props.editorInspector}
                <button type="button" onClick={props.onFindBuildableSpace} disabled={!props.landValid || busy}
                  className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">
                  {props.findingBuildable ? "Calculating setbacks…" : "Find buildable area"}
                </button>
              </section>
            </>
          )
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 p-4">
              <h2 className="font-bold text-slate-950">Plan requirements</h2>
              {!props.buildableResult ? <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Complete the land step first.</p> : (
                <>
                  <label className="mt-4 block text-xs font-semibold text-slate-600">Aspect ratio
                    <select value={props.aspectRatio} disabled={busy} onChange={(event) => props.onAspectRatioChange(event.target.value)}
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

            {activeGeneration && (
              <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-white to-indigo-50 p-4" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${generationSucceeded ? "bg-emerald-100 text-emerald-700" : generationTimedOut ? "bg-amber-100 text-amber-700" : terminalGeneration ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"}`}>
                      {!terminalGeneration && <span className="absolute inset-1 animate-ping rounded-lg bg-indigo-300/40" />}
                      <span className="relative text-sm font-black">{generationSucceeded ? "✓" : terminalGeneration ? "!" : "•••"}</span>
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">Live generation</p>
                      <h2 className="mt-0.5 text-sm font-black text-slate-950">{props.startingGeneration ? "Starting Generator" : terminalGeneration ? label(props.generation.view) : label(props.generation.stage ?? props.generation.view)}</h2>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${props.generation.connection === "open" ? "bg-emerald-100 text-emerald-700" : props.generation.connection === "reconnecting" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                    {terminalGeneration ? "finished" : props.startingGeneration ? "connecting" : props.generation.connection}
                  </span>
                </div>
                <div key={props.generation.lastSequence} className="mt-4 animate-event-swap rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm">
                  <p className="text-sm font-semibold leading-5 text-slate-700">{props.startingGeneration ? "Preparing the usable floor envelope…" : props.generation.message || label(props.generation.view)}</p>
                  {(props.generation.trialNumber || props.generation.trialLimit) && (
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">
                      {props.generation.trialNumber ? `Trial ${props.generation.trialNumber}` : "Preparing trial"}
                      {props.generation.trialLimit ? ` of ${props.generation.trialLimit}` : ""}
                    </p>
                  )}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-indigo-100">
                  <div className={`h-full rounded-full bg-indigo-600 transition-[width] duration-500 ${progress === null && !terminalGeneration ? "w-1/3 animate-pulse" : ""}`}
                    style={progress === null ? (terminalGeneration ? { width: "100%" } : undefined) : { width: `${progress}%` }} />
                </div>
                {props.generation.warning && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{props.generation.warning}</p>}
              </section>
            )}

            {(props.generation.status?.result || props.generation.status?.bestAvailable) && (() => {
              const result = props.generation.status?.result ?? props.generation.status?.bestAvailable;
              if (!result) return null;
              return (
                <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">{result.classification} plan</p><h2 className="mt-1 font-black">Score {result.scoring.totalScore.toFixed(1)}</h2></div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${result.scoring.passedCritical ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {result.scoring.passedCritical ? "Critical checks passed" : "Critical check failed"}
                    </span>
                  </div>
                  {result.scoring.criticalFailure && <div className="mt-3 rounded-xl border border-rose-200 bg-white/70 p-3 text-xs text-rose-800"><strong>{result.scoring.criticalFailure.code}</strong><p className="mt-1">{result.scoring.criticalFailure.message}</p></div>}
                  {props.generation.status?.result === result && result.floorPlan.openings.filter((opening) => opening.purpose === "main_entrance").length === 1 && <p className="mt-3 rounded-xl border border-emerald-200 bg-white/70 p-3 text-xs font-semibold text-emerald-800">Main entrance and required-room access network verified by the generator.</p>}
                  <p className="mt-3 text-[10px] leading-4 text-indigo-700/80">Score uses the current server scoring profile and should not be compared with older generation versions.</p>
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
              <button type="button" onClick={props.onGenerate} disabled={busy || !props.requirements || !props.buildableResult}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 disabled:opacity-40">
                {props.generation.view === "idle" ? "Generate floor plan" : "Generate again"}
              </button>
            )}
          </>
        )}
        {props.error && <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800"><strong className="block text-sm">Request failed</strong><span className="mt-1 block">{props.error.message}</span>{props.error.code && <code className="mt-2 block">{props.error.code}</code>}</section>}
      </div>
    </aside>
  );
};
