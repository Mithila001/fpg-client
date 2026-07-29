import { useMemo, useState } from "react";
import {
  FloorPlanWorkspace,
  type FloorPlanEditorSnapshot,
  type FloorPlanWorkspacePhase,
} from "../../features/floor-plan-editor";
import type {
  BuildableSpaceRequest,
  BuildableSpaceResult,
  CandidateHint,
  FloorPlan,
} from "../../types";

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

const buildableResult: BuildableSpaceResult = {
  flowId: "dev-buildable-space",
  projectUnitsPerMeter: 10,
  originalLandArea: 6562.5,
  referenceProfile: "development-preview",
  buildableLand: {
    boundary: {
      points: [
        { x: 8, y: 8 },
        { x: 84, y: 8 },
        { x: 95, y: 43 },
        { x: 66, y: 66 },
        { x: 8, y: 54 },
      ],
    },
    area: 4700,
    edgeSetbacks: [],
  },
  usableLand: {
    boundary: {
      points: [
        { x: 18, y: 17 },
        { x: 78, y: 17 },
        { x: 78, y: 57 },
        { x: 18, y: 57 },
      ],
    },
    width: 60,
    length: 40,
    area: 2400,
    floorWidthAlignment: "parallel_to_entry_road",
    entryRoadEdgeIndex: 0,
  },
};

const hints: CandidateHint[] = Array.from({ length: 70 }, (_, index) => ({
  roomId: `hint-room-${index % 7}`,
  x: 22 + ((index * 13) % 52),
  y: 21 + ((index * 17) % 32),
  roomType:
    index % 4 === 0
      ? "bedroom"
      : index % 4 === 1
        ? "living_room"
        : index % 4 === 2
          ? "kitchen"
          : "bathroom",
  hintIndex: index,
}));

const finalPlan: FloorPlan = {
  boundary: {
    points: [
      { x: 20, y: 18 },
      { x: 76, y: 18 },
      { x: 76, y: 56 },
      { x: 20, y: 56 },
    ],
  },
  rooms: [
    {
      id: "living",
      roomType: "living_room",
      name: "Living Room",
      boundary: {
        points: [
          { x: 20, y: 18 },
          { x: 49, y: 18 },
          { x: 49, y: 38 },
          { x: 20, y: 38 },
        ],
      },
      role: "standard",
      parentRoomId: null,
      metadata: { sourceRoomIds: ["living"], appliedTransformations: [] },
    },
    {
      id: "kitchen",
      roomType: "kitchen",
      name: "Kitchen",
      boundary: {
        points: [
          { x: 49, y: 18 },
          { x: 76, y: 18 },
          { x: 76, y: 38 },
          { x: 49, y: 38 },
        ],
      },
      role: "standard",
      parentRoomId: null,
      metadata: { sourceRoomIds: ["kitchen"], appliedTransformations: [] },
    },
    {
      id: "bedroom",
      roomType: "bedroom",
      name: "Bedroom",
      boundary: {
        points: [
          { x: 20, y: 38 },
          { x: 51, y: 38 },
          { x: 51, y: 56 },
          { x: 20, y: 56 },
        ],
      },
      role: "standard",
      parentRoomId: null,
      metadata: { sourceRoomIds: ["bedroom"], appliedTransformations: [] },
    },
    {
      id: "bathroom",
      roomType: "bathroom",
      name: "Bathroom",
      boundary: {
        points: [
          { x: 51, y: 38 },
          { x: 76, y: 38 },
          { x: 76, y: 56 },
          { x: 51, y: 56 },
        ],
      },
      role: "standard",
      parentRoomId: null,
      metadata: { sourceRoomIds: ["bathroom"], appliedTransformations: [] },
    },
  ],
  openings: [
    {
      id: "main-door",
      openingType: "door",
      purpose: "main_entrance",
      start: { x: 31, y: 56 },
      end: { x: 39, y: 56 },
      connectedRoomIds: ["bedroom"],
    },
    {
      id: "living-window",
      openingType: "window",
      purpose: "daylight",
      start: { x: 27, y: 18 },
      end: { x: 39, y: 18 },
      connectedRoomIds: ["living"],
    },
    {
      id: "kitchen-window",
      openingType: "window",
      purpose: "daylight",
      start: { x: 58, y: 18 },
      end: { x: 69, y: 18 },
      connectedRoomIds: ["kitchen"],
    },
  ],
  identityRedirects: {},
  appliedTransformations: [],
};

type DemoMode =
  | "edit"
  | "buildable"
  | "hints"
  | "candidate"
  | "final"
  | "no-result";

const demoButtons: Array<{ value: DemoMode; label: string }> = [
  { value: "edit", label: "1. Edit land" },
  { value: "buildable", label: "2. Buildable review" },
  { value: "hints", label: "3A. Hint stream" },
  { value: "candidate", label: "3B. Candidate plan" },
  { value: "final", label: "4. Final plan" },
  { value: "no-result", label: "No result" },
];

const FloorPlanEditorTestPage = () => {
  const [snapshot, setSnapshot] = useState<FloorPlanEditorSnapshot>({
    value: initialValue,
    isValid: true,
    issues: [],
  });
  const [demoMode, setDemoMode] = useState<DemoMode>("edit");

  const phase: FloorPlanWorkspacePhase = useMemo(() => {
    if (demoMode === "edit") return "editing-land";
    if (demoMode === "buildable") return "buildable-review";
    if (demoMode === "hints" || demoMode === "candidate") return "generating";
    if (demoMode === "final") return "final-plan";
    return "no-result";
  }, [demoMode]);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-6 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Development page
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Floor-plan workspace
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          The buttons below simulate the workflow phases. API and SSE handling stay
          outside the canvas feature.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {demoButtons.map((button) => (
          <button
            key={button.value}
            type="button"
            onClick={() => setDemoMode(button.value)}
            className={
              demoMode === button.value
                ? "rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                : "rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            }
          >
            {button.label}
          </button>
        ))}
      </nav>

      <FloorPlanWorkspace
        phase={phase}
        value={snapshot.value}
        onChange={setSnapshot}
        buildableResult={buildableResult}
        generation={
          phase === "generating"
            ? {
                title: "Generating floor plan",
                message:
                  demoMode === "hints"
                    ? "Testing room-location hints from the latest candidate trial."
                    : "A base floor plan was received. The server is continuing its evaluation.",
                hints,
                candidatePlan: demoMode === "candidate" ? finalPlan : null,
                progress: {
                  current: demoMode === "hints" ? 3 : 7,
                  total: 10,
                  label: "Candidate trials",
                },
              }
            : null
        }
        finalPlan={phase === "final-plan" ? finalPlan : null}
        defaultShowDimensions
      />

      <section className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Land editor output</h2>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              snapshot.isValid
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-rose-500/20 text-rose-300"
            }`}
          >
            {snapshot.isValid ? "Valid" : "Invalid"}
          </span>
        </div>
        <pre className="overflow-auto text-xs leading-5">
          {JSON.stringify(snapshot.value, null, 2)}
        </pre>
      </section>
    </div>
  );
};

export default FloorPlanEditorTestPage;
