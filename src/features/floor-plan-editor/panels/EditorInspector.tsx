import { formatProjectArea } from "../../../measurement";
import { polygonArea } from "../engine/geometry/polygon";
import type { EditorState } from "../engine/model/editor-state";

interface EditorInspectorProps {
  state: EditorState;
}

export const EditorInspector = ({ state }: EditorInspectorProps) => {
  const area = polygonArea(state.document.boundary.points);
  const selected = state.selection?.index;

  return (
    <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Editor state</h3>
        <p className="mt-1 text-xs text-slate-500">Feature-private interaction state stays inside this module.</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Area</dt>
          <dd className="mt-1 font-semibold text-slate-900">{formatProjectArea(area, "square-meter", { maximumFractionDigits: 2 })}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Mode</dt>
          <dd className="mt-1 font-semibold text-slate-900">{state.mode}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Selected</dt>
          <dd className="mt-1 font-semibold text-slate-900">{selected === undefined ? "None" : `Vertex ${selected + 1}`}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Road</dt>
          <dd className="mt-1 font-semibold text-slate-900">{state.document.road ? `Edge ${state.document.road.edgeIndex + 1}` : "Not placed"}</dd>
        </div>
      </dl>

      {state.feedback && (
        <div className={`rounded-lg px-3 py-2 text-sm ${state.feedback.kind === "error" ? "bg-rose-50 text-rose-700" : "bg-indigo-50 text-indigo-700"}`}>
          {state.feedback.message}
        </div>
      )}

      {!state.validation.isValid && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {state.validation.issues.map((issue) => <p key={issue.code}>{issue.message}</p>)}
        </div>
      )}
    </aside>
  );
};
