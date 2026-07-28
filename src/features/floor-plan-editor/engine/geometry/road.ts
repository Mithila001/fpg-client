import type { Point } from "../../../../types";
import type { EditorRoadPlacement } from "../model/editor-state";
import { signedPolygonArea } from "./polygon";
import { clamp, EPSILON } from "./vector";

export const buildRoadPolygon = (
  boundary: Point[],
  placement: EditorRoadPlacement,
): Point[] | null => {
  if (boundary.length < 2) return null;
  if (placement.edgeIndex < 0 || placement.edgeIndex >= boundary.length) {
    return null;
  }

  const start = boundary[placement.edgeIndex];
  const end = boundary[(placement.edgeIndex + 1) % boundary.length];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const edgeLength = Math.hypot(dx, dy);
  if (edgeLength < EPSILON) return null;

  const tangentX = dx / edgeLength;
  const tangentY = dy / edgeLength;
  const signedArea = signedPolygonArea(boundary);
  const outwardX = signedArea >= 0 ? tangentY : -tangentY;
  const outwardY = signedArea >= 0 ? -tangentX : tangentX;
  const t = clamp(placement.t, 0, 1);
  const anchor = { x: start.x + dx * t, y: start.y + dy * t };
  const halfWidth = placement.width / 2;
  const halfLength = placement.length / 2;
  const center = {
    x: anchor.x + outwardX * (placement.gap + halfWidth),
    y: anchor.y + outwardY * (placement.gap + halfWidth),
  };

  const alongX = tangentX * halfLength;
  const alongY = tangentY * halfLength;
  const normalX = outwardX * halfWidth;
  const normalY = outwardY * halfWidth;

  return [
    { x: center.x - alongX - normalX, y: center.y - alongY - normalY },
    { x: center.x + alongX - normalX, y: center.y + alongY - normalY },
    { x: center.x + alongX + normalX, y: center.y + alongY + normalY },
    { x: center.x - alongX + normalX, y: center.y - alongY + normalY },
  ];
};
