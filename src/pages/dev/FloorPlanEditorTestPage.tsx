import { useState } from "react";
import { FloorPlanEditor, type FloorPlanEditorSnapshot } from "../../features/floor-plan-editor";
import type { BuildableSpaceRequest } from "../../types";

const initialValue: BuildableSpaceRequest = {
  landBoundary: {
    points: [
      { x: 0, y: 0 },
      { x: 90, y: 0 },
      { x: 105, y: 45 },
      { x: 70, y: 75 },
      { x: 0, y: 60 },
    ],
  },
  roads: [],
};

const FloorPlanEditorTestPage = () => {
  const [snapshot, setSnapshot] = useState<FloorPlanEditorSnapshot>({
    value: initialValue,
    isValid: true,
    issues: [],
  });

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-6 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Development page</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">New floor-plan editor feature</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Edit vertices, add or remove a boundary point, then choose Place road and move near an edge to attach the entry road.
        </p>
      </header>

      <FloorPlanEditor initialValue={initialValue} onChange={setSnapshot} />

      <section className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Public feature output</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${snapshot.isValid ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
            {snapshot.isValid ? "Valid" : "Invalid"}
          </span>
        </div>
        <pre className="overflow-auto text-xs leading-5">{JSON.stringify(snapshot.value, null, 2)}</pre>
      </section>
    </div>
  );
};

export default FloorPlanEditorTestPage;
