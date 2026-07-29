import { Fragment } from "react";
import { Circle, Line, Text } from "react-konva";
import type { Point } from "../../../../types";
import { polygonCentroid } from "../../engine/geometry/polygon";

interface LandBoundaryLayerProps {
  points: Point[];
  scale: number;
  showVertexLabels?: boolean;
  muted?: boolean;
}

const LABEL_DISTANCE_PX = 20;
const LABEL_WIDTH_PX = 24;
const LABEL_HEIGHT_PX = 16;

const flatten = (points: Point[]): number[] =>
  points.flatMap((point) => [point.x, point.y]);

export const LandBoundaryLayer = ({
  points,
  scale,
  showVertexLabels = true,
  muted = false,
}: LandBoundaryLayerProps) => {
  const centroid = polygonCentroid(points);

  return (
    <>
      <Line
        points={flatten(points)}
        closed
        fill={muted ? "#f8fafc99" : "#eef2ff"}
        stroke={muted ? "#94a3b8" : "#1e293b"}
        strokeWidth={(muted ? 2 : 4) / scale}
        dash={muted ? [8 / scale, 6 / scale] : undefined}
        listening={false}
      />

      {showVertexLabels &&
        points.map((point, index) => {
          const dx = point.x - centroid.x;
          const dy = point.y - centroid.y;
          const directionLength = Math.hypot(dx, dy) || 1;
          const labelCenter = {
            x: point.x + (dx / directionLength) * (LABEL_DISTANCE_PX / scale),
            y: point.y + (dy / directionLength) * (LABEL_DISTANCE_PX / scale),
          };

          return (
            <Fragment key={`land-vertex-${index}`}>
              <Circle
                x={point.x}
                y={point.y}
                radius={5 / scale}
                fill={muted ? "#94a3b8" : "#4f46e5"}
                stroke="#ffffff"
                strokeWidth={2 / scale}
                listening={false}
              />
              <Text
                x={labelCenter.x - LABEL_WIDTH_PX / 2 / scale}
                y={labelCenter.y - LABEL_HEIGHT_PX / 2 / scale}
                width={LABEL_WIDTH_PX / scale}
                height={LABEL_HEIGHT_PX / scale}
                text={String.fromCharCode(65 + index)}
                fontSize={13 / scale}
                fontStyle="bold"
                fill={muted ? "#64748b" : "#334155"}
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
