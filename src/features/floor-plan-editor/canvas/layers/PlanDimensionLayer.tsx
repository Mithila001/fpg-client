import { Arrow, Group, Text } from "react-konva";
import { formatProjectLength } from "../../../../measurement";
import type { Point } from "../../../../types";
import type { PlanDimension } from "../../types/workspace.types";
import { distance } from "../../engine/geometry/vector";

interface PlanDimensionLayerProps {
  dimensions: PlanDimension[];
  scale: number;
  referenceCenter?: Point;
}

const directionForDimension = (
  dimension: PlanDimension,
  midpoint: Point,
  normal: Point,
  referenceCenter?: Point,
): number => {
  if (dimension.side === "left") return 1;
  if (dimension.side === "right") return -1;
  if (!referenceCenter) return 1;

  const awayFromCenter = {
    x: midpoint.x - referenceCenter.x,
    y: midpoint.y - referenceCenter.y,
  };
  return normal.x * awayFromCenter.x + normal.y * awayFromCenter.y >= 0
    ? 1
    : -1;
};

export const PlanDimensionLayer = ({
  dimensions,
  scale,
  referenceCenter,
}: PlanDimensionLayerProps) => (
  <Group listening={false}>
    {dimensions.map((dimension) => {
      const dx = dimension.end.x - dimension.start.x;
      const dy = dimension.end.y - dimension.start.y;
      const length = Math.hypot(dx, dy);
      if (length < 1e-8) return null;

      const tangent = { x: dx / length, y: dy / length };
      const normal = { x: -tangent.y, y: tangent.x };
      const midpoint = {
        x: (dimension.start.x + dimension.end.x) / 2,
        y: (dimension.start.y + dimension.end.y) / 2,
      };
      const direction = directionForDimension(
        dimension,
        midpoint,
        normal,
        referenceCenter,
      );
      const nx = normal.x * direction;
      const ny = normal.y * direction;
      const offset = (dimension.offsetPx ?? 26) / scale;
      const labelOffset = 12 / scale;
      const inset = length * (dimension.insetRatio ?? 0.08);
      const first = {
        x: dimension.start.x + tangent.x * inset + nx * offset,
        y: dimension.start.y + tangent.y * inset + ny * offset,
      };
      const second = {
        x: dimension.end.x - tangent.x * inset + nx * offset,
        y: dimension.end.y - tangent.y * inset + ny * offset,
      };
      const label = {
        x: midpoint.x + nx * (offset + labelOffset),
        y: midpoint.y + ny * (offset + labelOffset),
      };
      let rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (rotation > 90) rotation -= 180;
      if (rotation < -90) rotation += 180;

      return (
        <Group key={dimension.id}>
          <Arrow
            points={[first.x, first.y, second.x, second.y]}
            pointerAtBeginning
            pointerAtEnding
            pointerWidth={5 / scale}
            pointerLength={5 / scale}
            stroke="#0f766e"
            strokeWidth={1.2 / scale}
          />
          <Text
            x={label.x}
            y={label.y}
            text={
              dimension.label ??
              formatProjectLength(
                distance(dimension.start, dimension.end),
                "meter",
                { maximumFractionDigits: 2 },
              )
            }
            fontSize={12 / scale}
            fontStyle="bold"
            fill="#115e59"
            rotation={rotation}
            offsetX={30 / scale}
            offsetY={7 / scale}
          />
        </Group>
      );
    })}
  </Group>
);
