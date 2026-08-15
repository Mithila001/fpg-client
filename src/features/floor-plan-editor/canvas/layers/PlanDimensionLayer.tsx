import { Group, Line, Rect, Text } from "react-konva";
import { formatProjectLength } from "../../../../measurement";
import type { Point } from "../../../../types";
import type { PlanDimension } from "../../types/workspace.types";
import { distance } from "../../engine/geometry/vector";

interface PlanDimensionLayerProps {
  dimensions: PlanDimension[];
  scale: number;
  referenceCenter?: Point;
}

const dimensionLabel = (dimension: PlanDimension): string =>
  dimension.label ?? formatProjectLength(distance(dimension.start, dimension.end), "meter", {
    maximumFractionDigits: 2,
  });

const directionForDimension = (
  dimension: PlanDimension,
  midpoint: Point,
  normal: Point,
  referenceCenter?: Point,
): number => {
  if (dimension.placement === "inside") return 0;
  if (dimension.side === "left") return 1;
  if (dimension.side === "right") return -1;
  if (!referenceCenter) return 1;
  const away = { x: midpoint.x - referenceCenter.x, y: midpoint.y - referenceCenter.y };
  return normal.x * away.x + normal.y * away.y >= 0 ? 1 : -1;
};

const CompactRoomDimension = ({
  width,
  length,
  scale,
}: {
  width: PlanDimension;
  length: PlanDimension;
  scale: number;
}) => {
  const anchor = width.compactAnchor ?? length.compactAnchor ?? {
    x: (width.start.x + width.end.x) / 2,
    y: (length.start.y + length.end.y) / 2,
  };
  const label = `${dimensionLabel(width)} × ${dimensionLabel(length)}`;
  const labelWidth = Math.max(78, label.length * 6.5) / scale;
  return (
    <Group x={anchor.x} y={anchor.y + 15 / scale}>
      <Rect
        x={-labelWidth / 2}
        y={-8 / scale}
        width={labelWidth}
        height={16 / scale}
        fill="#ffffffeb"
        stroke="#99f6e4"
        strokeWidth={0.8 / scale}
        cornerRadius={4 / scale}
      />
      <Text
        x={-labelWidth / 2}
        y={-6 / scale}
        width={labelWidth}
        height={12 / scale}
        text={label}
        fontSize={9.5 / scale}
        fontStyle="bold"
        fill="#0f766e"
        align="center"
      />
    </Group>
  );
};

const ArchitecturalDimension = ({
  dimension,
  scale,
  referenceCenter,
}: {
  dimension: PlanDimension;
  scale: number;
  referenceCenter?: Point;
}) => {
  const dx = dimension.end.x - dimension.start.x;
  const dy = dimension.end.y - dimension.start.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-8) return null;
  const tangent = { x: dx / length, y: dy / length };
  const normal = { x: -tangent.y, y: tangent.x };
  const midpoint = { x: (dimension.start.x + dimension.end.x) / 2, y: (dimension.start.y + dimension.end.y) / 2 };
  const direction = directionForDimension(dimension, midpoint, normal, referenceCenter);
  const offset = direction * (dimension.offsetPx ?? 0) / scale;
  const first = { x: dimension.start.x + normal.x * offset, y: dimension.start.y + normal.y * offset };
  const second = { x: dimension.end.x + normal.x * offset, y: dimension.end.y + normal.y * offset };
  const label = dimensionLabel(dimension);
  const labelWidth = Math.max(42, label.length * 6.4) / scale;
  const tick = 5 / scale;
  const extension = dimension.placement === "outside" ? 6 / scale : 0;
  let rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (rotation > 90) rotation -= 180;
  if (rotation < -90) rotation += 180;
  const color = dimension.kind === "overall" ? "#334155" : "#0f766e";

  return (
    <Group>
      {dimension.placement === "outside" && (
        <>
          <Line points={[dimension.start.x, dimension.start.y, first.x + normal.x * extension, first.y + normal.y * extension]} stroke={color} strokeWidth={0.8 / scale} opacity={0.75} />
          <Line points={[dimension.end.x, dimension.end.y, second.x + normal.x * extension, second.y + normal.y * extension]} stroke={color} strokeWidth={0.8 / scale} opacity={0.75} />
        </>
      )}
      <Line points={[first.x, first.y, second.x, second.y]} stroke={color} strokeWidth={1 / scale}
        opacity={dimension.kind === "overall" ? 0.9 : 0.72} />
      {[first, second].map((point, index) => (
        <Line key={index} points={[
          point.x - normal.x * tick, point.y - normal.y * tick,
          point.x + normal.x * tick, point.y + normal.y * tick,
        ]} stroke={color} strokeWidth={1.2 / scale} />
      ))}
      <Group x={(first.x + second.x) / 2} y={(first.y + second.y) / 2} rotation={rotation}>
        <Rect x={-labelWidth / 2} y={-8 / scale} width={labelWidth} height={16 / scale}
          fill="#ffffffef" cornerRadius={3 / scale} />
        <Text x={-labelWidth / 2} y={-6 / scale} width={labelWidth} height={12 / scale}
          text={label} fontSize={(dimension.kind === "overall" ? 10.5 : 9.5) / scale}
          fontStyle="bold" fill={color} align="center" />
      </Group>
    </Group>
  );
};

export const PlanDimensionLayer = ({ dimensions, scale, referenceCenter }: PlanDimensionLayerProps) => {
  const compactRoomIds = new Set<string>();
  const roomDimensions = new Map<string, PlanDimension[]>();
  for (const dimension of dimensions) {
    if (!dimension.roomId) continue;
    const current = roomDimensions.get(dimension.roomId) ?? [];
    current.push(dimension);
    roomDimensions.set(dimension.roomId, current);
  }
  for (const [roomId, roomItems] of roomDimensions) {
    if (roomItems.length < 2) continue;
    const shortestScreenSpan = Math.min(...roomItems.map((item) => distance(item.start, item.end) * scale));
    if (shortestScreenSpan < 78) compactRoomIds.add(roomId);
  }

  return (
    <Group listening={false}>
      {dimensions.map((dimension) => {
        if (dimension.roomId && compactRoomIds.has(dimension.roomId)) {
          const pair = roomDimensions.get(dimension.roomId) ?? [];
          const width = pair.find((item) => item.kind === "room-width");
          const length = pair.find((item) => item.kind === "room-length");
          if (!width || !length || dimension.id !== width.id) return null;
          return <CompactRoomDimension key={`compact-${dimension.roomId}`} width={width} length={length} scale={scale} />;
        }
        return <ArchitecturalDimension key={dimension.id} dimension={dimension} scale={scale} referenceCenter={referenceCenter} />;
      })}
    </Group>
  );
};
