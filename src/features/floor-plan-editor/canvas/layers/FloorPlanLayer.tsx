import { Fragment } from "react";
import { Circle, Line, Rect, Text } from "react-konva";
import type {
  FloorPlan,
  FloorPlanOpening,
  FloorPlanRoom,
} from "../../../../types";
import { polygonBounds, polygonCentroid } from "../../engine/geometry/polygon";

interface FloorPlanLayerProps {
  plan: FloorPlan;
  scale: number;
  opacity?: number;
}

const ROOM_COLORS: Record<string, string> = {
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
  const bounds = polygonBounds(room.boundary.points);
  const availableWidthPx = Math.max(30, bounds.width * scale - 10);
  const labelWidth = Math.min(96, availableWidthPx) / scale;
  const labelHeight = 20 / scale;

  return (
    <Fragment>
      <Line
        points={flatten(room.boundary.points)}
        closed
        fill={room.role === "solver_placeholder" ? "#f1f5f9" : (ROOM_COLORS[room.roomType] ?? "#fafafa")}
        stroke="#475569"
        strokeWidth={1.6 / scale}
        lineJoin="round"
        dash={room.role === "solver_placeholder" ? [7 / scale, 4 / scale] : undefined}
        opacity={room.role === "solver_placeholder" ? 0.7 : 1}
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
        fontSize={Math.max(8.5, Math.min(11, availableWidthPx / 8)) / scale}
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
  const openingColor = isWindow
    ? "#0284c7"
    : opening.purpose === "main_entrance"
      ? "#ea580c"
      : opening.purpose === "secondary_entrance"
        ? "#d97706"
      : "#7c3aed";
  const dx = opening.end.x - opening.start.x;
  const dy = opening.end.y - opening.start.y;
  const openingLength = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / openingLength, y: dx / openingLength };
  const railOffset = 1.7 / scale;
  const jamb = 4 / scale;

  return (
    <Fragment>
      <Line points={points} stroke="#ffffff" strokeWidth={(isWindow ? 8 : 10) / scale} lineCap="butt" listening={false} />
      {isWindow ? (
        <>
          {[-railOffset, railOffset].map((offset) => (
            <Line key={offset} points={[
              opening.start.x + normal.x * offset, opening.start.y + normal.y * offset,
              opening.end.x + normal.x * offset, opening.end.y + normal.y * offset,
            ]} stroke={openingColor} strokeWidth={2 / scale} lineCap="round" shadowColor={openingColor} shadowBlur={3} listening={false} />
          ))}
        </>
      ) : (
        <>
          <Line points={points} stroke={openingColor}
            strokeWidth={(opening.purpose === "main_entrance" ? 5.5 : 4.5) / scale}
            lineCap="round" shadowColor={openingColor} shadowBlur={5} shadowOpacity={0.35} listening={false} />
          {[opening.start, opening.end].map((point, index) => (
            <Fragment key={`${opening.id}-jamb-${index}`}>
              <Line points={[point.x - normal.x * jamb, point.y - normal.y * jamb, point.x + normal.x * jamb, point.y + normal.y * jamb]}
                stroke={openingColor} strokeWidth={2 / scale} listening={false} />
              <Circle x={point.x} y={point.y} radius={2.2 / scale} fill="#ffffff" stroke={openingColor} strokeWidth={1.4 / scale} listening={false} />
            </Fragment>
          ))}
        </>
      )}
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
      strokeWidth={4.5 / scale}
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
      strokeWidth={4.5 / scale}
      lineJoin="round"
      opacity={opacity}
      listening={false}
    />

    {plan.openings.map((opening) => (
      <OpeningShape key={opening.id} opening={opening} scale={scale} />
    ))}
  </>
);
