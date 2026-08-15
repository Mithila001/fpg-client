import { Line } from "react-konva";
import type { Point } from "../../../../types";
import type { EditorRoadPlacement } from "../../engine/model/editor-state";
import { buildRoadPolygon } from "../../engine/geometry/road";

interface RoadLayerProps {
  boundary: Point[];
  road: EditorRoadPlacement | null;
  preview: EditorRoadPlacement | null;
  scale: number;
}

const flatten = (points: Point[]): number[] => points.flatMap((point) => [point.x, point.y]);

export const RoadLayer = ({ boundary, road, preview, scale }: RoadLayerProps) => {
  const roadPolygon = road ? buildRoadPolygon(boundary, road) : null;
  const previewPolygon = preview ? buildRoadPolygon(boundary, preview) : null;

  return (
    <>
      {roadPolygon && (
        <Line
          points={flatten(roadPolygon)}
          closed
          fill="#334155b8"
          stroke="#0f172acc"
          strokeWidth={1 / scale}
          listening={false}
        />
      )}
      {previewPolygon && (
        <Line
          points={flatten(previewPolygon)}
          closed
          fill="#47556955"
          stroke="#475569"
          dash={[8 / scale, 6 / scale]}
          strokeWidth={2 / scale}
          listening={false}
        />
      )}
    </>
  );
};
