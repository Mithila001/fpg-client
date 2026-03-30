import React from "react";
import InputPlanCanvas, { type RoomPoints } from "../InputPlanCanvas";
import type { RoadPlacement } from "../utils/geometry";
import type { UsableLandPoint } from "../../../api/usableLandApi";

interface StepAEditLayerProps {
  points: RoomPoints;
  borderCount: number;
  editable: boolean;
  roadMode: "idle" | "placing";
  placedRoad: RoadPlacement | null;
  buildableRectangle: UsableLandPoint[] | null;
  shrunkBoundary: UsableLandPoint[] | null;
  onAddBorderLine: () => void;
  onRemoveBorderLine: () => void;
  onPointsChange: (next: RoomPoints) => void;
  onRoadPlace: (placement: RoadPlacement) => void;
  onRoadCancel: () => void;
}

const StepAEditLayer: React.FC<StepAEditLayerProps> = ({
  points,
  borderCount,
  editable,
  roadMode,
  placedRoad,
  buildableRectangle,
  shrunkBoundary,
  onAddBorderLine,
  onRemoveBorderLine,
  onPointsChange,
  onRoadPlace,
  onRoadCancel,
}) => {
  return (
    <InputPlanCanvas
      points={points}
      borderCount={borderCount}
      editable={editable}
      roadMode={roadMode}
      placedRoad={placedRoad}
      buildableRectangle={buildableRectangle}
      shrunkBoundary={shrunkBoundary}
      onAddBorderLine={onAddBorderLine}
      onRemoveBorderLine={onRemoveBorderLine}
      onPointsChange={onPointsChange}
      onRoadPlace={onRoadPlace}
      onRoadCancel={onRoadCancel}
    />
  );
};

export default StepAEditLayer;
