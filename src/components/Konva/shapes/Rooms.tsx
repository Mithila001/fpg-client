import React from "react";
import { Line } from "react-konva";
import type { ProcessedRoomData } from "../../../types";
import { cmToPx } from "../../../utils/units";

interface RoomsProps {
  rooms: ProcessedRoomData[];
  pxPerCm: number;
  stageScale: number;
}

const Rooms: React.FC<RoomsProps> = ({ rooms, pxPerCm, stageScale }) => {
  return (
    <>
      {rooms.map((room, idx) => {
        // Apply 10x scale to vertices as requested
        const points = room.vertices.flatMap(([x, y]) => [
          cmToPx(x * 10, pxPerCm),
          -cmToPx(y * 10, pxPerCm),
        ]);

        // Professional floor color - subtle and clean
        const floorColor = "#E3E3E3"; 
        const strokeColor = "#D1D1D1"; 

        return (
          <Line
            key={`room-${idx}`}
            points={points}
            closed
            fill={floorColor}
            stroke={strokeColor}
            strokeWidth={1 / stageScale}
            listening={false} 
          />
        );
      })}
    </>
  );
};

export default Rooms;
