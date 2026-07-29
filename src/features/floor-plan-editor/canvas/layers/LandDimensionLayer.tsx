import { Arrow, Group, Text } from "react-konva";
import type { Point } from "../../../../types";
import { formatProjectLength } from "../../../../measurement";
import { polygonCentroid } from "../../engine/geometry/polygon";
import { distance } from "../../engine/geometry/vector";

interface LandDimensionLayerProps {
  points: Point[];
  scale: number;
}

const DIMENSION_END_INSET_RATIO = 0.1;

export const LandDimensionLayer = ({
  points,
  scale,
}: LandDimensionLayerProps) => {
  const centroid = polygonCentroid(points);

  return (
    <Group listening={false}>
      {points.map((start, index) => {
        const end = points[(index + 1) % points.length];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy);
        if (length < 1e-8) return null;

        const tangent = { x: dx / length, y: dy / length };
        const midpoint = {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2,
        };
        const normal = { x: -tangent.y, y: tangent.x };
        const fromCenter = {
          x: midpoint.x - centroid.x,
          y: midpoint.y - centroid.y,
        };
        const direction =
          normal.x * fromCenter.x + normal.y * fromCenter.y > 0 ? 1 : -1;
        const offset = 22 / scale;
        const labelOffset = 12 / scale;
        const nx = normal.x * direction;
        const ny = normal.y * direction;
        const endInset = length * DIMENSION_END_INSET_RATIO;
        const first = {
          x: start.x + tangent.x * endInset + nx * offset,
          y: start.y + tangent.y * endInset + ny * offset,
        };
        const second = {
          x: end.x - tangent.x * endInset + nx * offset,
          y: end.y - tangent.y * endInset + ny * offset,
        };
        const label = {
          x: midpoint.x + nx * (offset + labelOffset),
          y: midpoint.y + ny * (offset + labelOffset),
        };
        let rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (rotation > 90) rotation -= 180;
        if (rotation < -90) rotation += 180;

        return (
          <Group key={`land-dimension-${index}`}>
            <Arrow
              points={[first.x, first.y, second.x, second.y]}
              pointerAtBeginning
              pointerAtEnding
              pointerWidth={5 / scale}
              pointerLength={5 / scale}
              stroke="#64748b"
              strokeWidth={1 / scale}
            />
            <Text
              x={label.x}
              y={label.y}
              text={formatProjectLength(distance(start, end), "meter", {
                maximumFractionDigits: 2,
              })}
              fontSize={12 / scale}
              fontStyle="bold"
              fill="#334155"
              rotation={rotation}
              offsetX={28 / scale}
              offsetY={7 / scale}
            />
          </Group>
        );
      })}
    </Group>
  );
};
