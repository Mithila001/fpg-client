import type { Point } from "../../../../types";
import { snapPoint } from "../geometry/vector";
import type { EditorConfig } from "../model/editor-state";
import { validateBoundary } from "../rules/validate-boundary";

export const moveBoundaryVertex = (
  points: Point[],
  index: number,
  point: Point,
  config: EditorConfig,
): Point[] | null => {
  if (index < 0 || index >= points.length) return null;

  const next = points.map((current, currentIndex) =>
    currentIndex === index ? snapPoint(point, config.gridStep) : current,
  );
  return validateBoundary(next, config).isValid ? next : null;
};
