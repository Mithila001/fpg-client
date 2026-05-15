import React from "react";
import { Line } from "react-konva";
import type { ProcessedRoomData } from "../../../types";
import { cmToPx } from "../../../utils/units";

interface RoomsProps {
  rooms: ProcessedRoomData[];
  pxPerCm: number;
  stageScale: number;
}

const getRoomColor = (type: string): string => {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("bedroom")) return "#EEF2FF"; // Indigo 50
  if (normalizedType.includes("bathroom")) return "#F0FDF4"; // Green 50
  if (normalizedType.includes("kitchen")) return "#FFFBEB"; // Amber 50
  if (normalizedType.includes("dining")) return "#FFF1F2"; // Rose 50
  if (normalizedType.includes("veranda")) return "#F0FDFA"; // Teal 50
  if (normalizedType.includes("living")) return "#F8FAFC"; // Slate 50
  return "#F1F5F9"; // Default Lighter Gray
};

const Rooms: React.FC<RoomsProps> = ({ rooms, pxPerCm, stageScale }) => {
  return (
    <>
      {rooms.map((room, idx) => {
        // Apply 10x scale to vertices as requested
        const points = room.vertices.flatMap(([x, y]) => [
          cmToPx(x * 10, pxPerCm),
          -cmToPx(y * 10, pxPerCm),
        ]);

        const floorColor = getRoomColor(room.type);
        const strokeColor = "#CBD5E1"; 

        return (
          <Line
            key={`room-${idx}`}
            points={points}
            closed
            fill={floorColor}
            stroke={strokeColor}
            strokeWidth={1.5 / stageScale}
            listening={false} 
          />
        );
      })}
    </>
  );
};

export default Rooms;
