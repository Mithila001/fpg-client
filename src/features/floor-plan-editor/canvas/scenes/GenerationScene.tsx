import { Layer } from "react-konva";
import type { CandidateHint, FloorPlan } from "../../../../types";
import { FloorPlanLayer } from "../layers/FloorPlanLayer";
import { HintMapLayer } from "../layers/HintMapLayer";

interface GenerationSceneProps {
  hints: CandidateHint[];
  candidatePlan?: FloorPlan | null;
  scale: number;
}

export const GenerationScene = ({
  hints,
  candidatePlan,
  scale,
}: GenerationSceneProps) => (
  <Layer listening={false}>
    {candidatePlan ? (
      <FloorPlanLayer plan={candidatePlan} scale={scale} opacity={0.94} />
    ) : (
      <HintMapLayer hints={hints} scale={scale} />
    )}
  </Layer>
);
