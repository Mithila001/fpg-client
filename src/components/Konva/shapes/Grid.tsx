import React from "react";
import { Line, Text } from "react-konva";
import { formatLengthFromCm, pxToCm } from "../../../utils/units";

interface GridProps {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  gridSize: number;
  pxPerCm: number;
  stageScale: number;
}

const Grid: React.FC<GridProps> = ({ startX, endX, startY, endY, gridSize, pxPerCm, stageScale }) => {
  const elems: React.ReactNode[] = [];
  
  // Snap start points to the grid size
  const startGridX = Math.floor(startX / gridSize) * gridSize;
  const startGridY = Math.floor(startY / gridSize) * gridSize;

  for (let x = startGridX; x <= endX; x += gridSize) {
    elems.push(
      <Line key={`v${x}`} points={[x, startY, x, endY]} stroke="#f1f5f9" strokeWidth={1 / stageScale} />,
    );
    elems.push(
      <Text
        key={`lx${x}`}
        x={x + 2 / stageScale}
        y={startY + 2 / stageScale}
        text={formatLengthFromCm(pxToCm(x, pxPerCm), 1)}
        fontSize={10 / stageScale}
        fill="#cbd5e1"
      />,
    );
  }
  for (let y = startGridY; y <= endY; y += gridSize) {
    elems.push(
      <Line key={`h${y}`} points={[startX, y, endX, y]} stroke="#f1f5f9" strokeWidth={1 / stageScale} />,
    );
    elems.push(
      <Text
        key={`ly${y}`}
        x={startX + 2 / stageScale}
        y={y + 2 / stageScale}
        text={formatLengthFromCm(pxToCm(y, pxPerCm), 1)}
        fontSize={10 / stageScale}
        fill="#cbd5e1"
      />,
    );
  }
  return <>{elems}</>;
};

export default Grid;
