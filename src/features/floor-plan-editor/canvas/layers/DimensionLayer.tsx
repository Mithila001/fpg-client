import { Arrow, Group, Text } from "react-konva";
import type { Point } from "../../../../types";
import { formatProjectLength } from "../../../../measurement";
import { polygonCentroid } from "../../engine/geometry/polygon";
import { distance } from "../../engine/geometry/vector";

interface DimensionLayerProps {
  points: Point[];
  scale: number;
}

export const DimensionLayer = ({ points, scale }: DimensionLayerProps) => {
  const centroid = polygonCentroid(points);

  return (
    <Group listening={false}>
      {points.map((start, index) => {
        const end = points[(index + 1) % points.length];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy);
        if (length < 1e-8) return null;

        const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        const normal = { x: -dy / length, y: dx / length };
        const fromCenter = { x: midpoint.x - centroid.x, y: midpoint.y - centroid.y };
        const direction = normal.x * fromCenter.x + normal.y * fromCenter.y > 0 ? 1 : -1;
        const offset = 22 / scale;
        const labelOffset = 12 / scale;
        const nx = normal.x * direction;
        const ny = normal.y * direction;
        const first = { x: start.x + nx * offset, y: start.y + ny * offset };
        const second = { x: end.x + nx * offset, y: end.y + ny * offset };
        const label = {
          x: midpoint.x + nx * (offset + labelOffset),
          y: midpoint.y + ny * (offset + labelOffset),
        };
        let rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (rotation > 90) rotation -= 180;
        if (rotation < -90) rotation += 180;

        return (
          <Group key={`dimension-${index}`}>
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
