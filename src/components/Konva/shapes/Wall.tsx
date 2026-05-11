import React from "react";
import { Line } from "react-konva";
import type { Coordinate } from "./types";

interface WallProps {
  // array of successive points; every pair of points defines a wall segment
  points: Coordinate[];
  // thickness in pixels (stage coordinates)
  thickness?: number;
  // fill/stroke color of the wall
  color?: string;
  strokeColor?: string;
  stageScale: number;
}

const Wall: React.FC<WallProps> = ({
  points,
  thickness = 10,
  color = "#374151", // Charcoal gray fill
  strokeColor = "#111827", // Deep navy/black edge
  stageScale,
}) => {
  const elems: React.ReactNode[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;

    // unit normal (perpendicular) pointing to the right of the segment
    const nx = -dy / len;
    const ny = dx / len;
    const half = thickness / 2;

    const p1a = { x: p1.x + nx * half, y: p1.y + ny * half };
    const p1b = { x: p1.x - nx * half, y: p1.y - ny * half };
    const p2a = { x: p2.x + nx * half, y: p2.y + ny * half };
    const p2b = { x: p2.x - nx * half, y: p2.y - ny * half };

    const polygonPoints = [p1a.x, p1a.y, p2a.x, p2a.y, p2b.x, p2b.y, p1b.x, p1b.y];

    // Solid wall fill with subtle shadow
    elems.push(
      <Line
        key={`wall-seg-${i}`}
        points={polygonPoints}
        closed
        fill={color} 
        stroke={strokeColor}
        strokeWidth={1.5 / stageScale}
        lineJoin="round"
        shadowColor="rgba(0,0,0,0.1)"
        shadowBlur={2 / stageScale}
        shadowOffset={{ x: 1 / stageScale, y: 1 / stageScale }}
        shadowOpacity={0.5}
      />,
    );

    // Subtle inner line for architectural detail
    elems.push(
      <Line
        key={`wall-line-${i}`}
        points={[p1.x, p1.y, p2.x, p2.y]}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={0.5 / stageScale}
        lineCap="round"
      />,
    );
  }

  return <>{elems}</>;
};

export default Wall;
