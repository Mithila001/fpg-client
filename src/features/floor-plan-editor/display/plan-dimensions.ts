import type { FloorPlan, Point } from "../../../types";
import type { PlanDimension } from "../types/workspace.types";

export const createBoundaryPlanDimensions = (
  plan: FloorPlan,
): PlanDimension[] =>
  plan.boundary.points.map((start, index, points) => ({
    id: `plan-boundary-${index}`,
    start,
    end: points[(index + 1) % points.length],
    side: "outside",
    offsetPx: 28,
    insetRatio: 0.08,
  }));

export const averagePoint = (points: Point[]): Point => {
  if (points.length === 0) return { x: 0, y: 0 };
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
};
