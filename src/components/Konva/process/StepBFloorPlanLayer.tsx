import React from "react";
import CoordinateCanvas from "../KonvaCanvas";
import type { Coordinate, Label } from "../shapes/types";
import type { CanvasOpening } from "../../../types";

interface StepBFloorPlanLayerProps {
  segments: Coordinate[][] | null;
  labels: Label[] | null;
  openings: CanvasOpening[] | null;
  isLoading: boolean;
  status: string | null;
}

const StepBFloorPlanLayer: React.FC<StepBFloorPlanLayerProps> = ({
  segments,
  labels,
  openings,
  isLoading,
  status,
}) => {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded border border-slate-200 bg-white text-sm text-slate-700">
        Generating floor plan...
      </div>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded border border-slate-200 bg-white text-sm text-slate-700">
        {status ?? "No generated floor plan to display."}
      </div>
    );
  }

  return (
    <CoordinateCanvas
      segments={segments}
      labels={labels ?? undefined}
      openings={openings ?? undefined}
      pxPerCm={1}
      wallThickness={6}
    />
  );
};

export default StepBFloorPlanLayer;
