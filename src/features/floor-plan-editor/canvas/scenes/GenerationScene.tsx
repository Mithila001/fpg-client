import { Layer, Line } from "react-konva";
import type { CandidateHint, FloorPlan, Point } from "../../../../types";
import { FloorPlanLayer } from "../layers/FloorPlanLayer";
import { HintMapLayer } from "../layers/HintMapLayer";
import { LandDimensionLayer } from "../layers/LandDimensionLayer";

interface GenerationSceneProps {
  hints: CandidateHint[];
  candidatePlan?: FloorPlan | null;
  floorBoundary?: Point[];
  scale: number;
}

export const GenerationScene = ({
  hints,
  candidatePlan,
  floorBoundary = [],
  scale,
}: GenerationSceneProps) => (
  <Layer listening={false}>
    {floorBoundary.length >= 3 && !candidatePlan && (
      <>
        <Line
          points={floorBoundary.flatMap((point) => [point.x, point.y])}
          closed
          fill="#ffffff"
          stroke="#4f46e5"
          strokeWidth={3 / scale}
          shadowColor="#6366f1"
          shadowBlur={10 / scale}
          shadowOpacity={0.16}
        />
        <LandDimensionLayer points={floorBoundary} scale={scale} color="#4338ca"
          offsetPx={18} placement="inside" edgeIndexes={[0, 1]} />
      </>
    )}
    {candidatePlan ? (
      <FloorPlanLayer plan={candidatePlan} scale={scale} opacity={0.94} />
    ) : (
      <HintMapLayer hints={hints} scale={scale} />
    )}
  </Layer>
);
