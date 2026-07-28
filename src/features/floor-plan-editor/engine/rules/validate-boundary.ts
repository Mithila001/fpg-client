import type { Point } from "../../../../types";
import type { BoundaryIssue } from "../../types/editor.types";
import { segmentsIntersect } from "../geometry/intersection";
import { polygonArea } from "../geometry/polygon";
import { distance, EPSILON } from "../geometry/vector";
import type { BoundaryValidation, EditorConfig } from "../model/editor-state";

const hasSelfIntersection = (points: Point[]): boolean => {
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      const sharesVertex =
        first === second ||
        first === secondNext ||
        firstNext === second ||
        firstNext === secondNext;
      if (sharesVertex) continue;

      if (
        segmentsIntersect(
          points[first],
          points[firstNext],
          points[second],
          points[secondNext],
        )
      ) {
        return true;
      }
    }
  }
  return false;
};

const isConvex = (points: Point[]): boolean => {
  if (points.length < 4) return true;

  let direction = 0;
  for (let index = 0; index < points.length; index += 1) {
    const first = points[index];
    const second = points[(index + 1) % points.length];
    const third = points[(index + 2) % points.length];
    const cross =
      (second.x - first.x) * (third.y - second.y) -
      (second.y - first.y) * (third.x - second.x);
    if (Math.abs(cross) < EPSILON) continue;

    const currentDirection = cross > 0 ? 1 : -1;
    if (direction === 0) direction = currentDirection;
    else if (direction !== currentDirection) return false;
  }

  return direction !== 0;
};

export const validateBoundary = (
  points: Point[],
  config: EditorConfig,
): BoundaryValidation => {
  const issues: BoundaryIssue[] = [];

  if (points.length < config.minVertices) {
    issues.push({
      code: "too_few_vertices",
      message: `Boundary needs at least ${config.minVertices} vertices.`,
    });
  }

  if (points.length > config.maxVertices) {
    issues.push({
      code: "too_many_vertices",
      message: `Boundary supports at most ${config.maxVertices} vertices.`,
    });
  }

  for (let index = 0; index < points.length; index += 1) {
    const nextIndex = (index + 1) % points.length;
    if (distance(points[index], points[nextIndex]) < config.minimumEdgeLength) {
      issues.push({
        code: "edge_too_short",
        edgeIndex: index,
        message: `Edge ${index + 1} is shorter than the allowed minimum.`,
      });
      break;
    }
  }

  if (polygonArea(points) < EPSILON) {
    issues.push({ code: "zero_area", message: "Boundary area must be greater than zero." });
  }

  if (hasSelfIntersection(points)) {
    issues.push({
      code: "self_intersection",
      message: "Boundary edges cannot cross each other.",
    });
  }

  if (!isConvex(points)) {
    issues.push({
      code: "not_convex",
      message: "This editor currently requires a convex boundary.",
    });
  }

  return { isValid: issues.length === 0, issues };
};
