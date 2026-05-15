import type { ProcessedRoomData } from "../../../../types";
import type { DimensionPrimitive, Vertex2D } from "./types";

const MIN_ROOM_SPAN_CM = 20;

const normalizeVertices = (room: ProcessedRoomData): Vertex2D[] => {
  return room.vertices
    .map(([x, y]) => ({ x: x * 10, y: y * 10 }))
    .filter((v) => Number.isFinite(v.x) && Number.isFinite(v.y));
};

const pointPlus = (point: Vertex2D, dx: number, dy: number): Vertex2D => ({
  x: point.x + dx,
  y: point.y + dy,
});

const buildDimensionPrimitive = (
  roomName: string,
  edgeIndex: number,
  start: Vertex2D,
  end: Vertex2D,
  offset: Vertex2D,
  perpendicular: Vertex2D,
  lengthCm: number,
): DimensionPrimitive => {
  const dimStart = pointPlus(start, offset.x, offset.y);
  const dimEnd = pointPlus(end, offset.x, offset.y);
  const extStartA = pointPlus(
    start,
    offset.x + perpendicular.x * 12,
    offset.y + perpendicular.y * 12,
  );
  const extEndB = pointPlus(end, offset.x + perpendicular.x * 12, offset.y + perpendicular.y * 12);

  return {
    roomName,
    edgeIndex,
    extensionStartA: start,
    extensionEndA: extStartA,
    extensionStartB: end,
    extensionEndB: extEndB,
    dimensionStart: dimStart,
    dimensionEnd: dimEnd,
    tickStartA: pointPlus(dimStart, perpendicular.x * 6, perpendicular.y * 6),
    tickEndA: pointPlus(dimStart, -perpendicular.x * 6, -perpendicular.y * 6),
    tickStartB: pointPlus(dimEnd, perpendicular.x * 6, perpendicular.y * 6),
    tickEndB: pointPlus(dimEnd, -perpendicular.x * 6, -perpendicular.y * 6),
    labelPoint: pointPlus(
      { x: (dimStart.x + dimEnd.x) / 2, y: (dimStart.y + dimEnd.y) / 2 },
      offset.x * 0.25,
      offset.y * 0.25,
    ),
    lengthCm,
  };
};

export const buildRoomDimensionPrimitives = (
  rooms: ProcessedRoomData[],
  offsetCm = 27.5,
): DimensionPrimitive[] => {
  const primitives: DimensionPrimitive[] = [];

  rooms.forEach((room) => {
    const vertices = normalizeVertices(room);
    if (vertices.length < 3) {
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const vertex of vertices) {
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
    }

    const widthCm = maxX - minX;
    const heightCm = maxY - minY;
    if (widthCm < MIN_ROOM_SPAN_CM || heightCm < MIN_ROOM_SPAN_CM) {
      return;
    }

    const topStart = { x: minX, y: minY };
    const topEnd = { x: maxX, y: minY };
    const bottomStart = { x: minX, y: maxY };
    const bottomEnd = { x: maxX, y: maxY };
    const leftStart = { x: minX, y: minY };
    const leftEnd = { x: minX, y: maxY };
    const rightStart = { x: maxX, y: minY };
    const rightEnd = { x: maxX, y: maxY };

    primitives.push(
      buildDimensionPrimitive(
        room.name,
        0,
        topStart,
        topEnd,
        { x: 0, y: -offsetCm },
        { x: 0, y: 1 },
        widthCm,
      ),
      buildDimensionPrimitive(
        room.name,
        1,
        bottomStart,
        bottomEnd,
        { x: 0, y: offsetCm },
        { x: 0, y: -1 },
        widthCm,
      ),
      buildDimensionPrimitive(
        room.name,
        2,
        leftStart,
        leftEnd,
        { x: -offsetCm, y: 0 },
        { x: 1, y: 0 },
        heightCm,
      ),
      buildDimensionPrimitive(
        room.name,
        3,
        rightStart,
        rightEnd,
        { x: offsetCm, y: 0 },
        { x: -1, y: 0 },
        heightCm,
      ),
    );
  });

  return primitives;
};
