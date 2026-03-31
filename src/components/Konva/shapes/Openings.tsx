import React from "react";
import { Line } from "react-konva";
import type { CanvasOpening } from "../../../types";
import { OPENING_STYLE } from "../config/canvasScaling";

interface OpeningsProps {
  openings: CanvasOpening[];
  pxPerCm: number;
  offsetX: number;
  offsetY: number;
}

const rotate = (x: number, y: number, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
};

const getArcPoints = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  sweepDirection: 1 | -1,
): number[] => {
  const vx = endX - startX;
  const vy = endY - startY;
  const points: number[] = [];

  const steps = OPENING_STYLE.arcSteps;
  for (let i = 0; i <= steps; i += 1) {
    const t = (Math.PI / 2) * (i / steps) * sweepDirection;
    const rotated = rotate(vx, vy, t);
    points.push(startX + rotated.x, startY + rotated.y);
  }

  return points;
};

const Openings: React.FC<OpeningsProps> = ({ openings, pxPerCm, offsetX, offsetY }) => {
  return (
    <>
      {openings.map((opening, idx) => {
        const x1 = opening.x1 * pxPerCm + offsetX;
        const y1 = opening.y1 * pxPerCm + offsetY;
        const x2 = opening.x2 * pxPerCm + offsetX;
        const y2 = opening.y2 * pxPerCm + offsetY;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 0.001) {
          return null;
        }

        const nx = -dy / len;
        const ny = dx / len;

        if (opening.kind === "window") {
          const gap = OPENING_STYLE.windowGapPx;
          return (
            <React.Fragment key={`opening-${idx}`}>
              <Line points={[x1, y1, x2, y2]} stroke="#0f766e" strokeWidth={3} lineCap="round" />
              <Line
                points={[x1 + nx * gap, y1 + ny * gap, x2 + nx * gap, y2 + ny * gap]}
                stroke="#2dd4bf"
                strokeWidth={5}
                lineCap="round"
              />
              <Line
                points={[x1 - nx * gap, y1 - ny * gap, x2 - nx * gap, y2 - ny * gap]}
                stroke="#22d3ee"
                strokeWidth={5}
                lineCap="round"
              />
            </React.Fragment>
          );
        }

        const sweepDirection: 1 | -1 = opening.side === "west" || opening.side === "south" ? -1 : 1;
        const arcPoints = getArcPoints(x1, y1, x2, y2, sweepDirection);

        const leafAngle = (Math.PI / 2) * sweepDirection;
        const leafEndpoint = rotate(dx, dy, leafAngle);
        const leafX = x1 + leafEndpoint.x;
        const leafY = y1 + leafEndpoint.y;

        return (
          <React.Fragment key={`opening-${idx}`}>
            <Line points={[x1, y1, x2, y2]} stroke="#92400e" strokeWidth={2} lineCap="round" />
            <Line points={[x1, y1, leafX, leafY]} stroke="#b45309" strokeWidth={1.5} lineCap="round" />
            <Line points={arcPoints} stroke="#b45309" strokeWidth={1.5} lineCap="round" lineJoin="round" />
          </React.Fragment>
        );
      })}
    </>
  );
};

export default Openings;
