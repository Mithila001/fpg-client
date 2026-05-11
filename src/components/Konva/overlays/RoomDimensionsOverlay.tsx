import React, { useMemo } from "react";
import { Arrow, Group, Line, Text } from "react-konva";
import type { ProcessedRoomData } from "../../../types";
import { cmToPx, formatLengthFromCm } from "../../../utils/units";
import { buildRoomDimensionPrimitives } from "./dimensions/geometry";

interface RoomDimensionsOverlayProps {
  rooms: ProcessedRoomData[];
  pxPerCm: number;
  stageScale: number;
  precision?: number;
}

const RoomDimensionsOverlay: React.FC<RoomDimensionsOverlayProps> = ({
  rooms,
  pxPerCm,
  stageScale,
  precision = 1,
}) => {
  const primitives = useMemo(() => buildRoomDimensionPrimitives(rooms), [rooms]);

  if (primitives.length === 0) {
    return null;
  }

  const strokeWidth = 1 / stageScale;
  const tickStrokeWidth = 1.3 / stageScale;
  const fontSize = Math.max(12 / stageScale, 0.1);
  const textPadding = 4 / stageScale;

  return (
    <Group listening={false}>
      {primitives.map((primitive) => {
        const id = `${primitive.roomName}-${primitive.edgeIndex}`;

        const dimStartX = cmToPx(primitive.dimensionStart.x, pxPerCm);
        const dimStartY = -cmToPx(primitive.dimensionStart.y, pxPerCm);
        const dimEndX = cmToPx(primitive.dimensionEnd.x, pxPerCm);
        const dimEndY = -cmToPx(primitive.dimensionEnd.y, pxPerCm);

        const extensionAX1 = cmToPx(primitive.extensionStartA.x, pxPerCm);
        const extensionAY1 = -cmToPx(primitive.extensionStartA.y, pxPerCm);
        const extensionAX2 = cmToPx(primitive.extensionEndA.x, pxPerCm);
        const extensionAY2 = -cmToPx(primitive.extensionEndA.y, pxPerCm);

        const extensionBX1 = cmToPx(primitive.extensionStartB.x, pxPerCm);
        const extensionBY1 = -cmToPx(primitive.extensionStartB.y, pxPerCm);
        const extensionBX2 = cmToPx(primitive.extensionEndB.x, pxPerCm);
        const extensionBY2 = -cmToPx(primitive.extensionEndB.y, pxPerCm);

        const tickAX1 = cmToPx(primitive.tickStartA.x, pxPerCm);
        const tickAY1 = -cmToPx(primitive.tickStartA.y, pxPerCm);
        const tickAX2 = cmToPx(primitive.tickEndA.x, pxPerCm);
        const tickAY2 = -cmToPx(primitive.tickEndA.y, pxPerCm);

        const tickBX1 = cmToPx(primitive.tickStartB.x, pxPerCm);
        const tickBY1 = -cmToPx(primitive.tickStartB.y, pxPerCm);
        const tickBX2 = cmToPx(primitive.tickEndB.x, pxPerCm);
        const tickBY2 = -cmToPx(primitive.tickEndB.y, pxPerCm);

        const labelX = cmToPx(primitive.labelPoint.x, pxPerCm);
        const labelY = -cmToPx(primitive.labelPoint.y, pxPerCm);
        const text = formatLengthFromCm(primitive.lengthCm, precision);
        const deltaX = dimEndX - dimStartX;
        const deltaY = dimEndY - dimStartY;
        let textRotation = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
        if (textRotation > 90) textRotation -= 180;
        if (textRotation < -90) textRotation += 180;

        return (
          <Group key={id}>
            <Arrow
              points={[extensionAX1, extensionAY1, extensionAX2, extensionAY2]}
              stroke="#475569"
              strokeWidth={strokeWidth}
              pointerAtBeginning={false}
              pointerAtEnding={false}
            />
            <Arrow
              points={[extensionBX1, extensionBY1, extensionBX2, extensionBY2]}
              stroke="#475569"
              strokeWidth={strokeWidth}
              pointerAtBeginning={false}
              pointerAtEnding={false}
            />
            <Arrow
              points={[dimStartX, dimStartY, dimEndX, dimEndY]}
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              pointerAtBeginning
              pointerAtEnding
              pointerWidth={6 / stageScale}
              pointerLength={6 / stageScale}
            />
            <Line
              points={[tickAX1, tickAY1, tickAX2, tickAY2]}
              stroke="#1e293b"
              strokeWidth={tickStrokeWidth}
            />
            <Line
              points={[tickBX1, tickBY1, tickBX2, tickBY2]}
              stroke="#1e293b"
              strokeWidth={tickStrokeWidth}
            />
            <Text
              x={labelX}
              y={labelY}
              text={text}
              fontSize={fontSize}
              fill="#0f172a"
              align="center"
              verticalAlign="middle"
              rotation={textRotation}
              offsetX={fontSize * 1.8 + textPadding}
              offsetY={fontSize * 0.65 + textPadding}
              padding={textPadding}
              listening={false}
            />
          </Group>
        );
      })}
    </Group>
  );
};

export default RoomDimensionsOverlay;
