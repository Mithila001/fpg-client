import { Fragment } from "react";
import { Line, Rect, Text } from "react-konva";
import type {
  FloorPlan,
  FloorPlanOpening,
  FloorPlanRoom,
  RoomType,
} from "../../../../types";
import { polygonCentroid } from "../../engine/geometry/polygon";

interface FloorPlanLayerProps {
  plan: FloorPlan;
  scale: number;
  opacity?: number;
}

const ROOM_COLORS: Record<RoomType, string> = {
  bedroom: "#eef2ff",
  bathroom: "#ecfdf5",
  attached_bathroom: "#ecfeff",
  living_room: "#f8fafc",
  kitchen: "#fffbeb",
  dining_room: "#fff1f2",
  hallway: "#fff7ed",
  veranda: "#f0fdfa",
  garage: "#f1f5f9",
  open_area: "#fafafa",
};

const flatten = (points: Array<{ x: number; y: number }>): number[] =>
  points.flatMap((point) => [point.x, point.y]);

const RoomShape = ({ room, scale }: { room: FloorPlanRoom; scale: number }) => {
  const center = polygonCentroid(room.boundary.points);
  const labelWidth = 90 / scale;
  const labelHeight = 30 / scale;

  return (
    <Fragment>
      <Line
        points={flatten(room.boundary.points)}
        closed
        fill={ROOM_COLORS[room.roomType]}
        stroke="#475569"
        strokeWidth={2.2 / scale}
        lineJoin="round"
        listening={false}
      />
      <Rect
        x={center.x - labelWidth / 2}
        y={center.y - labelHeight / 2}
        width={labelWidth}
        height={labelHeight}
        fill="#ffffffd9"
        cornerRadius={4 / scale}
        listening={false}
      />
      <Text
        x={center.x - labelWidth / 2}
        y={center.y - labelHeight / 2}
        width={labelWidth}
        height={labelHeight}
        text={room.name}
        fontSize={12 / scale}
        fontStyle="bold"
        fill="#334155"
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Fragment>
  );
};

const OpeningShape = ({
  opening,
  scale,
}: {
  opening: FloorPlanOpening;
  scale: number;
}) => {
  const points = [
    opening.start.x,
    opening.start.y,
    opening.end.x,
    opening.end.y,
  ];
  const isWindow = opening.openingType === "window";

  return (
    <Fragment>
      <Line
        points={points}
        stroke="#ffffff"
        strokeWidth={(isWindow ? 5 : 8) / scale}
        lineCap="butt"
        listening={false}
      />
      <Line
        points={points}
        stroke={isWindow ? "#0284c7" : "#7c3aed"}
        strokeWidth={(isWindow ? 2.5 : 3) / scale}
        lineCap="round"
        listening={false}
      />
    </Fragment>
  );
};

export const FloorPlanLayer = ({
  plan,
  scale,
  opacity = 1,
}: FloorPlanLayerProps) => (
  <>
    <Line
      points={flatten(plan.boundary.points)}
      closed
      fill="#ffffff"
      stroke="#0f172a"
      strokeWidth={5 / scale}
      lineJoin="round"
      opacity={opacity}
      listening={false}
    />

    {plan.rooms.map((room) => (
      <RoomShape key={room.id} room={room} scale={scale} />
    ))}

    <Line
      points={flatten(plan.boundary.points)}
      closed
      stroke="#0f172a"
      strokeWidth={5 / scale}
      lineJoin="round"
      opacity={opacity}
      listening={false}
    />

    {plan.openings.map((opening) => (
      <OpeningShape key={opening.id} opening={opening} scale={scale} />
    ))}
  </>
);
