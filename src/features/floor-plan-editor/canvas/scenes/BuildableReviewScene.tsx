import { Layer } from "react-konva";
import type { BuildableSpaceResult, Point } from "../../../../types";
import type { EditorRoadPlacement } from "../../engine/model/editor-state";
import { BuildableLandLayer } from "../layers/BuildableLandLayer";
import { LandBoundaryLayer } from "../layers/LandBoundaryLayer";
import { LandDimensionLayer } from "../layers/LandDimensionLayer";
import { RoadLayer } from "../layers/RoadLayer";
import { UsableLandLayer } from "../layers/UsableLandLayer";

interface BuildableReviewSceneProps {
  landBoundary: Point[];
  road: EditorRoadPlacement | null;
  result?: BuildableSpaceResult | null;
  scale: number;
  showDimensions?: boolean;
  muted?: boolean;
}

export const BuildableReviewScene = ({
  landBoundary,
  road,
  result,
  scale,
  showDimensions = true,
  muted = false,
}: BuildableReviewSceneProps) => (
  <Layer listening={false}>
    <RoadLayer
      boundary={landBoundary}
      road={road}
      preview={null}
      scale={scale}
    />
    <LandBoundaryLayer
      points={landBoundary}
      scale={scale}
      showVertexLabels={!muted}
      muted={muted}
    />
    {result && (
      <>
        <BuildableLandLayer
          points={result.buildableLand.boundary.points}
          scale={scale}
        />
        <UsableLandLayer
          points={result.usableLand.boundary.points}
          scale={scale}
        />
      </>
    )}
    {showDimensions && (
      <>
        <LandDimensionLayer points={landBoundary} scale={scale} />
        {result && (
          <LandDimensionLayer
            points={result.usableLand.boundary.points}
            scale={scale}
            color="#1d4ed8"
            offsetPx={18}
            placement="inside"
            edgeIndexes={[0, 1]}
          />
        )}
      </>
    )}
  </Layer>
);
