import type { Point } from "../../../../types";
import { longestEdgeIndex, signedPolygonArea } from "../geometry/polygon";
import { snapPoint } from "../geometry/vector";
import type { EditorConfig } from "../model/editor-state";
import { validateBoundary } from "../rules/validate-boundary";

const insertAfter = (points: Point[], edgeIndex: number, point: Point): Point[] => [
  ...points.slice(0, edgeIndex + 1),
  point,
  ...points.slice(edgeIndex + 1),
];

export const addBoundaryVertex = (
  points: Point[],
  config: EditorConfig,
): Point[] | null => {
  if (points.length >= config.maxVertices || points.length < 2) return null;

  const edgeIndex = longestEdgeIndex(points);
  const start = points[edgeIndex];
  const end = points[(edgeIndex + 1) % points.length];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const outwardSign = signedPolygonArea(points) >= 0 ? 1 : -1;
  const normal = { x: (dy / length) * outwardSign, y: (-dx / length) * outwardSign };
  const offset = Math.max(config.gridStep, length * 0.15);

  const candidates = [
    snapPoint(
      { x: midpoint.x + normal.x * offset, y: midpoint.y + normal.y * offset },
      config.gridStep,
    ),
    snapPoint(
      { x: midpoint.x - normal.x * offset, y: midpoint.y - normal.y * offset },
      config.gridStep,
    ),
    snapPoint(midpoint, config.gridStep),
  ];

  for (const candidate of candidates) {
    const next = insertAfter(points, edgeIndex, candidate);
    if (validateBoundary(next, config).isValid) return next;
  }

  return null;
};
