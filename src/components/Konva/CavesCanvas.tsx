import React from "react";
import InputPlanCanvas, { type RoomPoints } from "./InputPlanCanvas";
import CoordinateCanvas from "./KonvaCanvas";
import type { RoadPlacement } from "./utils/geometry";
import type { UsableLandPoint } from "../../api/getUsableLand";
import type { Coordinate, Label } from "./shapes/types";
import type { CanvasOpening } from "../../types";

interface CavesCanvasProps {
  mode: "edit" | "view";
  editState: {
    points: RoomPoints;
    borderCount: number;
    editable: boolean;
    roadMode: "idle" | "placing";
    placedRoad: RoadPlacement | null;
    buildableRectangle: UsableLandPoint[] | null;
    buildableRectangleSides: any; // Using any for simplicity as it's a pass-through
    shrunkBoundary: UsableLandPoint[] | null;
  };
  editActions: {
    onAddBorderLine: () => void;
    onRemoveBorderLine: () => void;
    onPointsChange: (next: RoomPoints) => void;
    onRoadPlace: (placement: RoadPlacement) => void;
    onRoadCancel: () => void;
  };
  viewState: {
    segments: Coordinate[][] | null;
    labels: Label[] | null;
    openings: CanvasOpening[] | null;
    isLoading: boolean;
    status: string | null;
  };
}

const CavesCanvas: React.FC<CavesCanvasProps> = ({ mode, editState, editActions, viewState }) => {
  if (mode === "edit") {
    return (
      <InputPlanCanvas
        points={editState.points}
        borderCount={editState.borderCount}
        editable={editState.editable}
        roadMode={editState.roadMode}
        placedRoad={editState.placedRoad}
        buildableRectangle={editState.buildableRectangle}
        buildableRectangleSides={editState.buildableRectangleSides}
        shrunkBoundary={editState.shrunkBoundary}
        onAddBorderLine={editActions.onAddBorderLine}
        onRemoveBorderLine={editActions.onRemoveBorderLine}
        onPointsChange={editActions.onPointsChange}
        onRoadPlace={editActions.onRoadPlace}
        onRoadCancel={editActions.onRoadCancel}
      />
    );
  }

  if (viewState.isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded border border-slate-200 bg-white text-sm text-slate-700">
        Generating floor plan...
      </div>
    );
  }

  if (!viewState.segments || viewState.segments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded border border-slate-200 bg-white text-sm text-slate-700">
        {viewState.status ?? "No generated floor plan to display."}
      </div>
    );
  }

  return (
    <CoordinateCanvas
      segments={viewState.segments}
      labels={viewState.labels ?? undefined}
      openings={viewState.openings ?? undefined}
      pxPerCm={0.01}
      wallThickness={6}
    />
  );
};

export default CavesCanvas;
