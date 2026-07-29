import { Layer } from "react-konva";
import type { FloorPlan } from "../../../../types";
import { averagePoint } from "../../display/plan-dimensions";
import type { PlanDimension } from "../../types/workspace.types";
import { FloorPlanLayer } from "../layers/FloorPlanLayer";
import { PlanDimensionLayer } from "../layers/PlanDimensionLayer";

interface FinalPlanSceneProps {
  plan: FloorPlan;
  scale: number;
  dimensions: PlanDimension[];
  showDimensions: boolean;
}

export const FinalPlanScene = ({
  plan,
  scale,
  dimensions,
  showDimensions,
}: FinalPlanSceneProps) => (
  <>
    <Layer listening={false}>
      <FloorPlanLayer plan={plan} scale={scale} />
    </Layer>

    {showDimensions && dimensions.length > 0 && (
      <Layer listening={false}>
        <PlanDimensionLayer
          dimensions={dimensions}
          scale={scale}
          referenceCenter={averagePoint(plan.boundary.points)}
        />
      </Layer>
    )}
  </>
);
