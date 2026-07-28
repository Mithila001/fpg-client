import type { EditorMode } from "../types/editor.types";

interface EditorToolbarProps {
  mode: EditorMode;
  vertexCount: number;
  minVertices: number;
  maxVertices: number;
  hasRoad: boolean;
  readOnly: boolean;
  onModeChange: (mode: EditorMode) => void;
  onAddVertex: () => void;
  onRemoveVertex: () => void;
  onClearRoad: () => void;
}

const modeClass = (active: boolean): string =>
  active
    ? "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
    : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";

export const EditorToolbar = ({
  mode,
  vertexCount,
  minVertices,
  maxVertices,
  hasRoad,
  readOnly,
  onModeChange,
  onAddVertex,
  onRemoveVertex,
  onClearRoad,
}: EditorToolbarProps) => (
  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
    <button type="button" className={modeClass(mode === "edit-boundary")} onClick={() => onModeChange("edit-boundary")} disabled={readOnly}>Edit boundary</button>
    <button type="button" className={modeClass(mode === "place-road")} onClick={() => onModeChange("place-road")} disabled={readOnly}>Place road</button>
    <button type="button" className={modeClass(mode === "inspect")} onClick={() => onModeChange("inspect")}>Inspect</button>
    <span className="mx-1 h-7 w-px bg-slate-200" />
    <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" onClick={onAddVertex} disabled={readOnly || vertexCount >= maxVertices}>Add vertex</button>
    <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" onClick={onRemoveVertex} disabled={readOnly || vertexCount <= minVertices}>Remove selected</button>
    {hasRoad && (
      <button type="button" className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40" onClick={onClearRoad} disabled={readOnly}>Remove road</button>
    )}
    <span className="ml-auto text-xs font-medium text-slate-500">{vertexCount}/{maxVertices} vertices</span>
  </div>
);
