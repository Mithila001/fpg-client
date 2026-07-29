import type Konva from "konva";
import { Fragment } from "react";
import { Circle, Line, Text } from "react-konva";
import type { Point } from "../../../../types";
import { polygonCentroid } from "../../engine/geometry/polygon";
import type { EditorMode } from "../../types/editor.types";

interface BoundaryLayerProps {
  points: Point[];
  mode: EditorMode;
  scale: number;
  selectedVertexIndex: number | null;
  onSelectVertex: (index: number) => void;
  onMoveVertex: (index: number, point: Point) => void;
}

const LABEL_DISTANCE_PX = 20;
const LABEL_WIDTH_PX = 24;
const LABEL_HEIGHT_PX = 16;

const flatten = (points: Point[]): number[] =>
  points.flatMap((point) => [point.x, point.y]);

export const BoundaryLayer = ({
  points,
  mode,
  scale,
  selectedVertexIndex,
  onSelectVertex,
  onMoveVertex,
}: BoundaryLayerProps) => {
  const editable = mode === "edit-boundary";
  const centroid = polygonCentroid(points);

  const handleDrag = (
    index: number,
    event: Konva.KonvaEventObject<DragEvent>,
  ) => {
    onMoveVertex(index, { x: event.target.x(), y: event.target.y() });
  };

  return (
    <>
      <Line
        points={flatten(points)}
        closed
        fill="#eef2ff"
        stroke="#1e293b"
        strokeWidth={4 / scale}
        listening={false}
      />
      {points.map((point, index) => {
        const fromCentroidX = point.x - centroid.x;
        const fromCentroidY = point.y - centroid.y;
        const directionLength = Math.hypot(fromCentroidX, fromCentroidY) || 1;
        const labelCenter = {
          x:
            point.x +
            (fromCentroidX / directionLength) * (LABEL_DISTANCE_PX / scale),
          y:
            point.y +
            (fromCentroidY / directionLength) * (LABEL_DISTANCE_PX / scale),
        };

        return (
          <Fragment key={`vertex-${index}`}>
            <Circle
              x={point.x}
              y={point.y}
              radius={7 / scale}
              fill={selectedVertexIndex === index ? "#f97316" : "#4f46e5"}
              stroke="#ffffff"
              strokeWidth={2 / scale}
              draggable={editable}
              onMouseDown={(event: Konva.KonvaEventObject<MouseEvent>) => {
                event.cancelBubble = true;
                onSelectVertex(index);
              }}
              onDragStart={() => onSelectVertex(index)}
              onDragMove={(event: Konva.KonvaEventObject<DragEvent>) =>
                handleDrag(index, event)
              }
              onDragEnd={(event: Konva.KonvaEventObject<DragEvent>) =>
                handleDrag(index, event)
              }
            />
            <Text
              x={labelCenter.x - LABEL_WIDTH_PX / 2 / scale}
              y={labelCenter.y - LABEL_HEIGHT_PX / 2 / scale}
              width={LABEL_WIDTH_PX / scale}
              height={LABEL_HEIGHT_PX / scale}
              text={String.fromCharCode(65 + index)}
              fontSize={13 / scale}
              fontStyle="bold"
              fill="#334155"
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </Fragment>
        );
      })}
    </>
  );
};
