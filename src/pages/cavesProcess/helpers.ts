import type { CornerKey, RoomPoints } from "../../components/Konva/InputPlanCanvas";
import type {
  UsableLandRoadConnectedSegment,
  UsableLandPoint,
} from "../../api/usableLandApi";
import type { RoadPlacement } from "../../components/Konva/utils/geometry";

export const edgeDistance = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const buildClosedLoopCoordinates = (
  points: RoomPoints,
  orderedKeys: CornerKey[],
): UsableLandPoint[] => {
  const loop = orderedKeys.map((key) => ({ x: points[key].x, y: points[key].y }));
  if (loop.length > 0) {
    loop.push({ ...loop[0] });
  }
  return loop;
};

export const buildRoadConnectedSegments = (
  points: RoomPoints,
  orderedKeys: CornerKey[],
  roads: RoadPlacement[],
): UsableLandRoadConnectedSegment[] => {
  return roads
    .map((road) => {
      const startKey = orderedKeys[road.segmentIndex];
      const endKey = orderedKeys[(road.segmentIndex + 1) % orderedKeys.length];
      if (!startKey || !endKey) return null;

      return {
        segment: [
          { x: points[startKey].x, y: points[startKey].y },
          { x: points[endKey].x, y: points[endKey].y },
        ],
        roadType: "mainRoad" as const,
      };
    })
    .filter((item): item is UsableLandRoadConnectedSegment => item !== null);
};
