import type { ProjectLength } from "./measurement";

export interface Point {
  x: ProjectLength;
  y: ProjectLength;
}

export interface Polygon {
  points: Point[];
}
