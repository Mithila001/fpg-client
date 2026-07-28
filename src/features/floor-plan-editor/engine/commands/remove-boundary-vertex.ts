import type { Point } from "../../../../types";
import type { EditorConfig } from "../model/editor-state";
import { validateBoundary } from "../rules/validate-boundary";

export const removeBoundaryVertex = (
  points: Point[],
  index: number,
  config: EditorConfig,
): Point[] | null => {
  if (points.length <= config.minVertices || index < 0 || index >= points.length) {
    return null;
  }

  const next = points.filter((_, currentIndex) => currentIndex !== index);
  return validateBoundary(next, config).isValid ? next : null;
};
