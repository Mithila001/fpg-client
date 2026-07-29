import { Layer } from "react-konva";
import type { Point } from "../../../../types";
import type { EditorState } from "../../engine/model/editor-state";
import { BoundaryLayer } from "../layers/BoundaryLayer";
import { LandDimensionLayer } from "../layers/LandDimensionLayer";
import { RoadLayer } from "../layers/RoadLayer";

interface LandEditingSceneProps {
  state: EditorState;
  scale: number;
  onSelectVertex: (index: number) => void;
  onMoveVertex: (index: number, point: Point) => void;
}

export const LandEditingScene = ({
  state,
  scale,
  onSelectVertex,
  onMoveVertex,
}: LandEditingSceneProps) => (
  <Layer>
    <RoadLayer
      boundary={state.document.boundary.points}
      road={state.document.road}
      preview={state.roadPreview}
      scale={scale}
    />
    <BoundaryLayer
      points={state.document.boundary.points}
      mode={state.mode}
      scale={scale}
      selectedVertexIndex={state.selection?.index ?? null}
      onSelectVertex={onSelectVertex}
      onMoveVertex={onMoveVertex}
    />
    <LandDimensionLayer
      points={state.document.boundary.points}
      scale={scale}
    />
  </Layer>
);
