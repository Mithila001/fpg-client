import type { EditorMode } from "../types/editor.types";

const buttonClass = (active = false): string =>
  active
    ? "rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm"
    : "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40";

interface LandModificationToolbarProps {
  mode: EditorMode;
  vertexCount: number;
  minVertices: number;
  maxVertices: number;
  readOnly: boolean;
  onModeChange: (mode: EditorMode) => void;
  onAddVertex: () => void;
  onRemoveVertex: () => void;
}

export const LandModificationToolbar = ({
  mode,
  vertexCount,
  minVertices,
  maxVertices,
  readOnly,
  onModeChange,
  onAddVertex,
  onRemoveVertex,
}: LandModificationToolbarProps) => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-2">
      <button type="button" className={buttonClass(mode === "edit-boundary")} onClick={() => onModeChange("edit-boundary")} disabled={readOnly}>Edit boundary</button>
      <button type="button" className={buttonClass(mode === "inspect")} onClick={() => onModeChange("inspect")}>Inspect</button>
      <button type="button" className={buttonClass()} onClick={onAddVertex} disabled={readOnly || vertexCount >= maxVertices}>Add vertex</button>
    </div>
    <div className="flex items-center justify-between gap-3">
      <button type="button" className={buttonClass()} onClick={onRemoveVertex} disabled={readOnly || vertexCount <= minVertices}>Remove selected vertex</button>
      <span className="shrink-0 text-[11px] font-semibold text-slate-500">{vertexCount} of {maxVertices} vertices</span>
    </div>
  </div>
);

interface RoadPlacementToolbarProps {
  mode: EditorMode;
  hasRoad: boolean;
  readOnly: boolean;
  onModeChange: (mode: EditorMode) => void;
  onClearRoad: () => void;
}

export const RoadPlacementToolbar = ({
  mode,
  hasRoad,
  readOnly,
  onModeChange,
  onClearRoad,
}: RoadPlacementToolbarProps) => (
  <div className="mt-3 grid grid-cols-2 gap-2">
    <button type="button" className={buttonClass(mode === "place-road")} onClick={() => onModeChange("place-road")} disabled={readOnly}>
      {hasRoad ? "Move road" : "Place road"}
    </button>
    <button type="button" className="rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={onClearRoad} disabled={readOnly || !hasRoad}>
      Remove road
    </button>
  </div>
);
