import React from "react";
import { Circle, Line } from "react-konva";
import type { CanvasVeranda } from "../../../types";

interface VerandaProps {
  veranda: CanvasVeranda;
  pxPerCm: number;
  offsetX: number;
  offsetY: number;
}

const VERANDA_STYLE = {
  outline: "#0f766e",
  pillarFill: "#0f766e",
  pillarStroke: "#ffffff",
  outlineWidth: 2,
  pillarRadius: 4,
} as const;

const toCanvasPoint = (x: number, y: number, pxPerCm: number, offsetX: number, offsetY: number) => ({
  x: x * pxPerCm + offsetX,
  y: y * pxPerCm + offsetY,
});

const Veranda: React.FC<VerandaProps> = ({ veranda, pxPerCm, offsetX, offsetY }) => {
  const leftPillar = toCanvasPoint(
    veranda.leftPillar.x,
    veranda.leftPillar.y,
    pxPerCm,
    offsetX,
    offsetY,
  );
  const rightPillar = toCanvasPoint(
    veranda.rightPillar.x,
    veranda.rightPillar.y,
    pxPerCm,
    offsetX,
    offsetY,
  );

  const orderedBackPoints = [...veranda.backPoints]
    .map((point) => toCanvasPoint(point.x, point.y, pxPerCm, offsetX, offsetY))
    .sort((a, b) => a.x - b.x || a.y - b.y);

  const leftBack = orderedBackPoints[0] ?? leftPillar;
  const rightBack = orderedBackPoints[orderedBackPoints.length - 1] ?? rightPillar;

  const outlinePoints = [
    leftPillar.x,
    leftPillar.y,
    leftBack.x,
    leftBack.y,
    rightBack.x,
    rightBack.y,
    rightPillar.x,
    rightPillar.y,
  ];

  return (
    <>
      <Line
        points={outlinePoints}
        closed
        stroke={VERANDA_STYLE.outline}
        strokeWidth={VERANDA_STYLE.outlineWidth}
        lineCap="round"
        lineJoin="round"
      />
      <Circle
        x={leftPillar.x}
        y={leftPillar.y}
        radius={VERANDA_STYLE.pillarRadius}
        fill={VERANDA_STYLE.pillarFill}
        stroke={VERANDA_STYLE.pillarStroke}
        strokeWidth={1}
      />
      <Circle
        x={rightPillar.x}
        y={rightPillar.y}
        radius={VERANDA_STYLE.pillarRadius}
        fill={VERANDA_STYLE.pillarFill}
        stroke={VERANDA_STYLE.pillarStroke}
        strokeWidth={1}
      />
    </>
  );
};

export default Veranda;
