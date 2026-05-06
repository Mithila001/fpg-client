import React from "react";
import { Line } from "react-konva";
import type { CanvasOpening } from "../../../types";

interface OpeningsProps {
  openings: CanvasOpening[];
  pxPerCm: number;
  offsetX: number;
  offsetY: number;
}



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
          const gap = 3;
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

        const gap = 3;
        return (
          <React.Fragment key={`opening-${idx}`}>
            <Line points={[x1, y1, x2, y2]} stroke="#9f1239" strokeWidth={3} lineCap="round" />
            <Line
              points={[x1 + nx * gap, y1 + ny * gap, x2 + nx * gap, y2 + ny * gap]}
              stroke="#ef4444"
              strokeWidth={5}
              lineCap="round"
            />
            <Line
              points={[x1 - nx * gap, y1 - ny * gap, x2 - nx * gap, y2 - ny * gap]}
              stroke="#fca5a5"
              strokeWidth={5}
              lineCap="round"
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

export default Openings;
