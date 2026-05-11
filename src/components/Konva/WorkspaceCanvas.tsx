import React from "react";
import InputPlanCanvas, { type RoomPoints } from "./InputPlanCanvas";
import CoordinateCanvas from "./KonvaCanvas";
import type { RoadPlacement } from "./utils/geometry";
import type { UsableLandPoint } from "../../api/getUsableLand";
import type { Coordinate, Label } from "./shapes/types";
import type { CanvasOpening } from "../../types";
import type { PointHint } from "./InputPlanCanvas";
import type { ProcessedRoomData } from "../../types";
import type { BuildableRectangleSides } from "../../api/getUsableLand";

interface WorkspaceViewEffects {
  roomDimensions?: {
    enabled: boolean;
    rooms: ProcessedRoomData[] | null;
  };
}

interface WorkspaceCanvasProps {
  mode: "edit" | "view";
  editState: {
    points: RoomPoints;
    borderCount: number;
    editable: boolean;
    roadMode: "idle" | "placing";
    placedRoad: RoadPlacement | null;
    buildableRectangle: UsableLandPoint[] | null;
    buildableRectangleSides: BuildableRectangleSides | null;
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
    pointHints: PointHint[] | null;
  };
  viewEffects?: WorkspaceViewEffects;
}

const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({
  mode,
  editState,
  editActions,
  viewState,
  viewEffects,
}) => {
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
      <InputPlanCanvas
        points={editState.points}
        borderCount={editState.borderCount}
        editable={false}
        roadMode="idle"
        placedRoad={editState.placedRoad}
        buildableRectangle={editState.buildableRectangle}
        buildableRectangleSides={editState.buildableRectangleSides}
        shrunkBoundary={editState.shrunkBoundary}
        onPointsChange={() => {}}
        isBlurred={true}
        pointHints={viewState.pointHints}
      />
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
      viewEffects={viewEffects}
    />
  );
};

export default WorkspaceCanvas;
