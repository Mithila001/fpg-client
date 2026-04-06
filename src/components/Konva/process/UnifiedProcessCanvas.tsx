import React from "react";
import type { RoomPoints } from "../InputPlanCanvas";
import type { RoadPlacement } from "../utils/geometry";
import type { UsableLandPoint } from "../../../api/usableLandApi";
import type { Coordinate, Label } from "../shapes/types";
import type { CanvasOpening, CanvasVeranda } from "../../../types";
import StepAEditLayer from "./StepAEditLayer";
import StepBFloorPlanLayer from "./StepBFloorPlanLayer";

interface UnifiedProcessCanvasProps {
  mode: "edit" | "view";
  editState: {
    points: RoomPoints;
    borderCount: number;
    editable: boolean;
    roadMode: "idle" | "placing";
    placedRoad: RoadPlacement | null;
    buildableRectangle: UsableLandPoint[] | null;
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
    veranda: CanvasVeranda | null;
    isLoading: boolean;
    status: string | null;
  };
}

const UnifiedProcessCanvas: React.FC<UnifiedProcessCanvasProps> = ({
  mode,
  editState,
  editActions,
  viewState,
}) => {
  return (
    <div className="h-full w-full rounded border border-slate-200 bg-white">
      {mode === "edit" ? (
        <StepAEditLayer
          points={editState.points}
          borderCount={editState.borderCount}
          editable={editState.editable}
          roadMode={editState.roadMode}
          placedRoad={editState.placedRoad}
          buildableRectangle={editState.buildableRectangle}
          shrunkBoundary={editState.shrunkBoundary}
          onAddBorderLine={editActions.onAddBorderLine}
          onRemoveBorderLine={editActions.onRemoveBorderLine}
          onPointsChange={editActions.onPointsChange}
          onRoadPlace={editActions.onRoadPlace}
          onRoadCancel={editActions.onRoadCancel}
        />
      ) : (
        <StepBFloorPlanLayer
          segments={viewState.segments}
          labels={viewState.labels}
          openings={viewState.openings}
          veranda={viewState.veranda}
          isLoading={viewState.isLoading}
          status={viewState.status}
        />
      )}
    </div>
  );
};

export default UnifiedProcessCanvas;
