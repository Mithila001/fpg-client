import React from "react";
import { Line, Text } from "react-konva";
import { pxToCm, unitConverter_systemCmToMetersDisplay } from "../../../utils/units";

interface GridProps {
  dimensions: { width: number; height: number };
  gridSize: number;
  pxPerCm: number;
}

const Grid: React.FC<GridProps> = ({ dimensions, gridSize, pxPerCm }) => {
  const elems: React.ReactNode[] = [];
  for (let x = 0; x <= dimensions.width; x += gridSize) {
    elems.push(
      <Line key={`v${x}`} points={[x, 0, x, dimensions.height]} stroke="#e0e0e0" strokeWidth={1} />,
    );
    elems.push(
      <Text
        key={`lx${x}`}
        x={x + 2}
        y={2}
        text={unitConverter_systemCmToMetersDisplay(pxToCm(x, pxPerCm), 1)}
        fontSize={10}
        fill="#999"
      />,
    );
  }
  for (let y = 0; y <= dimensions.height; y += gridSize) {
    elems.push(
      <Line key={`h${y}`} points={[0, y, dimensions.width, y]} stroke="#e0e0e0" strokeWidth={1} />,
    );
    elems.push(
      <Text
        key={`ly${y}`}
        x={2}
        y={y + 2}
        text={unitConverter_systemCmToMetersDisplay(pxToCm(y, pxPerCm), 1)}
        fontSize={10}
        fill="#999"
      />,
    );
  }
  return <>{elems}</>;
};

export default Grid;
